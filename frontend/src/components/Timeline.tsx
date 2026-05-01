interface TimelineItem {
  label: string;
  title: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-blue-200" />
      {items.map((item, i) => (
        <div key={i} className="relative pb-4 last:pb-0">
          <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
          <div className="ml-3">
            <div className="text-xs text-blue-600 font-medium">{item.label}</div>
            <div className="text-sm text-gray-800 mt-0.5">{item.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
