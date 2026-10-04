import JailMonkey from 'jail-monkey';

/** Same checks as v2's reader: hooking frameworks (Frida etc.) or jailbreak/root. */
export function isDeviceCompromised(): boolean {
  try {
    return JailMonkey.hookDetected() || JailMonkey.isJailBroken();
  } catch {
    return false;
  }
}

export const COMPROMISED_TITLE = 'ސެކިއުރިޓީ މައްސަލައެއް';
export const COMPROMISED_MESSAGE =
  'މި ފޯނުގައި ސެކިއުރިޓީ މައްސަލައެއް ހުރުމުން ފޮތް ހުޅުވޭކަށް ނެތް. USB debugging ނިއްވާލައްވާ ނުވަތަ އެހެން ފޯނެއް ބޭނުންކުރައްވާ.\n\nThere is a security vulnerability on this device. Please turn off USB debugging or use another device.';
