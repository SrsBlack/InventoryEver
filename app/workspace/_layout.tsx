import { Stack } from 'expo-router';

export default function WorkspaceLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }} />;
}
