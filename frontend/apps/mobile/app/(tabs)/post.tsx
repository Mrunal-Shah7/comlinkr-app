// The Post tab never opens: its trigger is disabled and pressing it opens the compose sheet
// (app/(tabs)/_layout.tsx, plan 02). NativeTabs needs a route behind every trigger, so this one renders nothing.
export default function PostTab() {
  return null;
}
