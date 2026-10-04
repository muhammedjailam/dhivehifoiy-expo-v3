import { Redirect } from 'expo-router';

/** Unknown deep links fall back to home (same as v2). */
export default function NotFound() {
  return <Redirect href="/home" />;
}
