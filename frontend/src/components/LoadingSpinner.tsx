type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

export default function LoadingSpinner({ size = 'md', label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3" aria-label={label}>
      <div
        className={`${sizeMap[size]} rounded-full border-indigo-200 border-t-indigo-600 animate-spin`}
        aria-hidden="true"
      />
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
