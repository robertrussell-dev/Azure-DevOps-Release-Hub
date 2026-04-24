import { useState, useEffect, useRef, useCallback } from 'react';
import { TrackedStage } from '../types';
import { getCachedAccessToken } from '../services';
import { buildTimelineUrl, buildReleaseEnvironmentUrl } from '../constants/endpoints';
import { MONITOR_POLL_MS, TIMELINE_API_VERSION, RELEASE_API_VERSION } from '../constants';
import { showDebug } from '../utils/debugFlag';

interface UseStageMonitorOptions {
  orgBaseUrl: string;
  project: string;
}

export const useStageMonitor = (
  trackedStages: TrackedStage[],
  onStageCompleted: (stage: TrackedStage) => void,
  options: UseStageMonitorOptions | null
) => {
  const [stageStatuses, setStageStatuses] = useState<Map<string, TrackedStage>>(new Map());
  const onStageCompletedRef = useRef(onStageCompleted);
  const trackedStagesRef = useRef(trackedStages);
  const optionsRef = useRef(options);
  const consecutiveFailuresRef = useRef<Map<string, number>>(new Map());
  // Guard: prevent overlapping polls and duplicate completions
  const isPollingRef = useRef(false);
  const completedIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs current to avoid stale closures
  useEffect(() => {
    onStageCompletedRef.current = onStageCompleted;
  }, [onStageCompleted]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    trackedStagesRef.current = trackedStages;
    // Sync stageStatuses map when trackedStages changes (new stages added)
    setStageStatuses(prev => {
      const next = new Map(prev);
      for (const stage of trackedStages) {
        if (!next.has(stage.approvalId)) {
          next.set(stage.approvalId, stage);
        }
      }
      return next;
    });
  }, [trackedStages]);

  const pollTimelines = useCallback(async () => {
    const opts = optionsRef.current;
    if (!opts) return;

    const stages = trackedStagesRef.current;
    if (stages.length === 0) return;

    // Prevent overlapping polls
    if (isPollingRef.current) {
      showDebug('[MONITOR] Skipping poll, previous poll still in-flight');
      return;
    }
    isPollingRef.current = true;

    try {
      // Separate YAML and Classic stages
      const yamlStages: TrackedStage[] = [];
      const classicStages: TrackedStage[] = [];
      for (const stage of stages) {
        if (completedIdsRef.current.has(stage.approvalId)) continue;
        if (stage.type === 'classic') {
          classicStages.push(stage);
        } else {
          yamlStages.push(stage);
        }
      }

      // Deduplicate YAML stages by buildId so we only fetch each build's timeline once
      const buildMap = new Map<number, TrackedStage[]>();
      for (const stage of yamlStages) {
        const existing = buildMap.get(stage.buildId) || [];
        existing.push(stage);
        buildMap.set(stage.buildId, existing);
      }

      if (buildMap.size === 0 && classicStages.length === 0) return;

      showDebug(`[MONITOR] Polling ${buildMap.size} build timeline(s) + ${classicStages.length} classic release(s)`);

      // Poll YAML Pipeline stages via Build Timeline API
      for (const [buildId, buildStages] of buildMap) {
        try {
          const url = buildTimelineUrl(opts.orgBaseUrl, opts.project, buildId.toString(), TIMELINE_API_VERSION);
          const accessToken = await getCachedAccessToken();

          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            showDebug(`[MONITOR] Timeline fetch failed for build ${buildId}: ${response.status}`);
            for (const stage of buildStages) {
              const count = (consecutiveFailuresRef.current.get(stage.approvalId) || 0) + 1;
              consecutiveFailuresRef.current.set(stage.approvalId, count);
              if (count >= 5) {
                showDebug(`[MONITOR] Giving up on ${stage.pipelineName} > ${stage.stageName} after 5 failures`);
                completedIdsRef.current.add(stage.approvalId);
                const failedStage: TrackedStage = { ...stage, status: 'failed', lastChecked: new Date() };
                setStageStatuses(prev => {
                  const next = new Map(prev);
                  next.set(stage.approvalId, failedStage);
                  return next;
                });
                onStageCompletedRef.current(failedStage);
              }
            }
            continue;
          }

          const timelineData = await response.json();
          const records = timelineData?.records || [];

          const stageRecords = records.filter((r: any) => r.type === 'Stage');
          const phaseRecords = records.filter((r: any) => r.type === 'Phase');
          const searchRecords = stageRecords.length > 0 ? stageRecords : phaseRecords;

          for (const stage of buildStages) {
            // Double-check we haven't already completed this one
            if (completedIdsRef.current.has(stage.approvalId)) continue;

            const matchingRecord = searchRecords.find((r: any) => r.name === stage.stageName);

            if (!matchingRecord) {
              showDebug(`[MONITOR] Stage "${stage.stageName}" not found in timeline for build ${buildId}`);
              continue;
            }

            consecutiveFailuresRef.current.delete(stage.approvalId);

            let newStatus: TrackedStage['status'] = 'running';
            if (matchingRecord.state === 'completed') {
              if (matchingRecord.result === 'succeeded') {
                newStatus = 'succeeded';
              } else if (matchingRecord.result === 'failed') {
                newStatus = 'failed';
              } else if (matchingRecord.result === 'canceled') {
                newStatus = 'canceled';
              } else {
                newStatus = 'failed';
              }
            }

            const updatedStage: TrackedStage = {
              ...stage,
              status: newStatus,
              lastChecked: new Date(),
            };

            setStageStatuses(prev => {
              const next = new Map(prev);
              next.set(stage.approvalId, updatedStage);
              return next;
            });

            if (newStatus !== 'running') {
              showDebug(`[MONITOR] Stage "${stage.stageName}" completed: ${newStatus}`);
              completedIdsRef.current.add(stage.approvalId);
              onStageCompletedRef.current(updatedStage);
            }
          }
        } catch (err) {
          showDebug(`[MONITOR] Error polling build ${buildId}: ${err}`);
        }
      }

      // Poll Classic Release stages via Release Environment API
      for (const stage of classicStages) {
        try {
          if (!stage.releaseId || !stage.environmentId) continue;

          const url = buildReleaseEnvironmentUrl(opts.orgBaseUrl, opts.project, stage.releaseId, stage.environmentId, RELEASE_API_VERSION);
          const accessToken = await getCachedAccessToken();

          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            showDebug(`[MONITOR] Release environment fetch failed for release ${stage.releaseId} env ${stage.environmentId}: ${response.status}`);
            const count = (consecutiveFailuresRef.current.get(stage.approvalId) || 0) + 1;
            consecutiveFailuresRef.current.set(stage.approvalId, count);
            if (count >= 5) {
              showDebug(`[MONITOR] Giving up on ${stage.pipelineName} > ${stage.stageName} after 5 failures`);
              completedIdsRef.current.add(stage.approvalId);
              const failedStage: TrackedStage = { ...stage, status: 'failed', lastChecked: new Date() };
              setStageStatuses(prev => {
                const next = new Map(prev);
                next.set(stage.approvalId, failedStage);
                return next;
              });
              onStageCompletedRef.current(failedStage);
            }
            continue;
          }

          const envData = await response.json();
          consecutiveFailuresRef.current.delete(stage.approvalId);

          // Map Classic Release environment status to our status
          let newStatus: TrackedStage['status'] = 'running';
          const envStatus = (envData.status || '').toLowerCase();
          if (envStatus === 'succeeded' || envStatus === 'partiallysucceeded') {
            newStatus = 'succeeded';
          } else if (envStatus === 'rejected' || envStatus === 'failed') {
            newStatus = 'failed';
          } else if (envStatus === 'canceled') {
            newStatus = 'canceled';
          }
          // 'inprogress', 'notstarted', 'scheduled', 'queued' all remain 'running'

          const updatedStage: TrackedStage = {
            ...stage,
            status: newStatus,
            lastChecked: new Date(),
          };

          setStageStatuses(prev => {
            const next = new Map(prev);
            next.set(stage.approvalId, updatedStage);
            return next;
          });

          if (newStatus !== 'running') {
            showDebug(`[MONITOR] Classic release "${stage.stageName}" completed: ${newStatus}`);
            completedIdsRef.current.add(stage.approvalId);
            onStageCompletedRef.current(updatedStage);
          }
        } catch (err) {
          showDebug(`[MONITOR] Error polling classic release ${stage.releaseId}: ${err}`);
        }
      }
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Schedule next poll only after current one finishes (prevents stacking)
  const scheduleNextPoll = useCallback(() => {
    timerRef.current = setTimeout(async () => {
      await pollTimelines();
      // Only reschedule if there are still stages to track
      if (trackedStagesRef.current.length > 0) {
        scheduleNextPoll();
      }
    }, MONITOR_POLL_MS);
  }, [pollTimelines]);

  // Start/stop polling based on tracked stages and options
  useEffect(() => {
    if (!options || trackedStages.length === 0) {
      // Clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Poll immediately, then schedule the chain
    pollTimelines().then(() => {
      if (trackedStagesRef.current.length > 0) {
        scheduleNextPoll();
      }
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // Only re-trigger when options identity changes or we go from 0 -> N stages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, trackedStages.length > 0]);

  return { stageStatuses };
};
