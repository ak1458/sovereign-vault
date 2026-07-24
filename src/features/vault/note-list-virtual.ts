export interface VirtualWindowInput {
  itemCount: number
  itemHeight: number
  viewportHeight: number
  scrollTop: number
  overscan: number
}

export interface VirtualWindowResult {
  startIndex: number
  endIndex: number
  totalHeight: number
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

export const computeVirtualWindow = (
  input: VirtualWindowInput,
): VirtualWindowResult => {
  const itemCount = Math.max(0, input.itemCount)
  const itemHeight = Math.max(1, input.itemHeight)
  const overscan = Math.max(0, input.overscan)
  const viewportHeight = Math.max(1, input.viewportHeight)
  const scrollTop = Math.max(0, input.scrollTop)

  if (itemCount === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      totalHeight: 0,
    }
  }

  const firstVisibleIndex = Math.floor(scrollTop / itemHeight)
  const visibleCount = Math.ceil(viewportHeight / itemHeight)

  const startIndex = clamp(firstVisibleIndex - overscan, 0, itemCount)
  const endIndex = clamp(
    firstVisibleIndex + visibleCount + overscan,
    0,
    itemCount,
  )

  return {
    startIndex,
    endIndex,
    totalHeight: itemCount * itemHeight,
  }
}
