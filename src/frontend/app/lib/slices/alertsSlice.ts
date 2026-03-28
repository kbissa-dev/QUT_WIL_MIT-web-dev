import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface AlertState {
  hasActiveAlert: boolean;
  alertId: string;
  memberName: string;
  timestamp: string;
  confidence: number;
}

type SetAlertPayload = {
  alertId: string;
  memberName: string;
  timestamp: string;
  confidence: number;
};

const initialState: AlertState = {
  hasActiveAlert: false,
  alertId: "",
  memberName: "",
  timestamp: "",
  confidence: 0,
};

export const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    setAlert: (state, action: PayloadAction<SetAlertPayload>) => {
      state.hasActiveAlert = true;
      state.alertId = action.payload.alertId;
      state.memberName = action.payload.memberName;
      state.timestamp = action.payload.timestamp;
      state.confidence = action.payload.confidence;
    },
    clearAlert: () => {
      return initialState;
    },
  },
});

export const { setAlert, clearAlert } = alertsSlice.actions;

export const selectHasActiveAlert = (state: RootState) =>
  state.alerts.hasActiveAlert;

export const selectActiveAlert = (state: RootState) => state.alerts;

export default alertsSlice.reducer;