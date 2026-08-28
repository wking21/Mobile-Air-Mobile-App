import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalEntrySheet } from './src/components/GlobalEntrySheet';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppProvider } from './src/state/AppContext';
import { SheetProvider } from './src/state/SheetContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <SheetProvider>
          <RootNavigator />
          <GlobalEntrySheet />
          <StatusBar style="dark" />
        </SheetProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
