// client/src/app/store.js
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootRedcuer";
import { authApi } from "../features/api/authApi";
import { courseApi } from "../features/api/courseApi";
import { purchaseApi } from "../features/api/purchaseApi";
import { courseProgressApi } from "../features/api/courseProgressApi";
// ✅ NEW import
import { testApi } from "../features/api/testApi";

export const appStore = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      courseApi.middleware,
      purchaseApi.middleware,
      courseProgressApi.middleware,
      // ✅ NEW middleware
      testApi.middleware
    ),
});

// Bootstrapping user
const initializeApp = async () => {
  try {
    await appStore.dispatch(
      authApi.endpoints.loadUser.initiate(undefined, { forceRefetch: true })
    );
  } catch (err) {
    console.error("initializeApp error:", err);
  }
};

initializeApp();
