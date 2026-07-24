let clearTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Copies text to device clipboard and schedules auto-clearing after 30 seconds for security.
 */
export async function copySecureToClipboard(
  text: string,
  autoClearMs = 30_000,
): Promise<{ success: boolean; autoClearSec: number }> {
  if (!navigator.clipboard || !text) {
    return { success: false, autoClearSec: 0 }
  }

  try {
    await navigator.clipboard.writeText(text)

    if (clearTimer) {
      clearTimeout(clearTimer)
    }

    if (autoClearMs > 0) {
      clearTimer = setTimeout(async () => {
        try {
          const currentText = await navigator.clipboard.readText()
          if (currentText === text) {
            await navigator.clipboard.writeText('')
          }
        } catch {
          // Fallback if clipboard permission expires
        }
      }, autoClearMs)
    }

    return { success: true, autoClearSec: Math.round(autoClearMs / 1000) }
  } catch {
    return { success: false, autoClearSec: 0 }
  }
}
