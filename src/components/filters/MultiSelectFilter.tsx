import React from 'react';
import { 
  Checkbox,
  Autocomplete,
  TextField,
  Box
} from '@mui/material';

interface MultiSelectFilterProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (event: any, newValue: string[]) => void;
  width?: number;
  limitTags?: number;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  width = 300,
  limitTags = 2
}) => {
  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      onChange={onChange}
      disableCloseOnSelect
      limitTags={limitTags}
      getLimitTagsText={(more) => `+${more} more`}
      renderOption={(props, option, { selected }) => (
        <Box component="li" {...props}>
          <Checkbox
            style={{ marginRight: 8 }}
            checked={selected}
          />
          {option}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          size="small"
          placeholder={placeholder}
        />
      )}
      sx={{ width }}
    />
  );
};
