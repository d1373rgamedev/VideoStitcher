interface StitchControlsProps {
  videoCount: number
  onStitch: () => void
}

function StitchControls({ videoCount, onStitch }: StitchControlsProps) {
  const isDisabled = videoCount < 2

  return (
    <div className="stitch-controls">
      <button
        className="btn btn-primary btn-large"
        onClick={onStitch}
        disabled={isDisabled}
        title={isDisabled ? 'Add at least 2 videos to stitch' : 'Stitch videos together'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        Stitch Videos
      </button>
      {isDisabled && (
        <p className="stitch-hint">Add at least 2 videos to enable stitching</p>
      )}
    </div>
  )
}

export default StitchControls
