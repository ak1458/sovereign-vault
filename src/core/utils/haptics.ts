import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export const triggerHapticFeedback = async (type: 'light' | 'medium' | 'error' | 'success' = 'light') => {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light })
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error })
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success })
    }
  } catch {
    // Graceful fallback for non-supported hardware
  }
}
