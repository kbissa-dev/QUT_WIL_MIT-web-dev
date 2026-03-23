import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface AlertState {
  hasActiveAlert: boolean;
  memberName: string;
  timestamp: string;
  confidence: number;
}

const initialState: AlertState = {
  hasActiveAlert: false,
  memberName: "",
  timestamp: "",
  confidence: 0,
};

export const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    setAlert: (state, action: PayloadAction<Omit<AlertState, "hasActiveAlert">>) => {
      state.hasActiveAlert = true;
      state.memberName = action.payload.memberName;
      state.timestamp = action.payload.timestamp;
      state.confidence = action.payload.confidence;
    },
    clearAlert: (state) => {
      return initialState;
    },
  },
});

export const { setAlert, clearAlert } = alertsSlice.actions;
export const selectHasActiveAlert = (state: RootState) => state.alerts.hasActiveAlert;
export default alertsSlice.reducer;