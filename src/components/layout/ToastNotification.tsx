import * as React from "react";

interface ToastNotificationProps {
  message: string;
  isError?: boolean;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, isError = false }) => {
  return (
    <div className={`toast-notification${isError ? ' error' : ''}`}>
      {message}
    </div>
  );
};
