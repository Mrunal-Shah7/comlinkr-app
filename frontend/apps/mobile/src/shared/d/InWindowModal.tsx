// src/shared/d/InWindowModal.tsx — React Native's Modal, drawn in the app's own window on Android (plan 07, TR-041).
//
// A Modal opens its own Android window, which shows the navigation bar the app hides (plan 04). On Android this hands
// its content to the sheet portal as a full-screen layer, above the screens and the tab bar; the content draws its
// own backdrop, as it did inside the Modal. Back calls onRequestClose. On iOS it is the Modal itself.
import { useEffect, useId, useLayoutEffect, type ReactElement, type ReactNode } from 'react';
import { Modal } from 'react-native';
import { useSheetPortal } from './SheetPortal';

type Props = {
  visible: boolean;
  onRequestClose?: () => void;
  animationType?: 'slide' | 'fade' | 'none';
  children: ReactNode;
  // Accepted so call sites keep their Modal props; the in-window layer has no use for them.
  transparent?: boolean;
  statusBarTranslucent?: boolean;
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  onDismiss?: () => void;
};

export function InWindowModal(props: Props) {
  if (process.env.EXPO_OS !== 'android') {
    const { children, ...rest } = props;
    return <Modal {...rest}>{children}</Modal>;
  }
  return <AndroidLayer {...props} />;
}

function AndroidLayer({ visible, onRequestClose, animationType, presentationStyle, transparent, children }: Props) {
  const id = useId();
  // A pageSheet or an opaque Modal covers the screen: give it a slide like the Modal's.
  const animation = animationType ?? (presentationStyle || !transparent ? 'slide' : 'fade');
  useLayoutEffect(() => {
    useSheetPortal.getState().put(id, {
      kind: 'layer', visible, onClose: () => onRequestClose?.(), animation, children: children as ReactElement,
    });
  });
  useEffect(() => () => useSheetPortal.getState().remove(id), [id]);
  return null;
}
