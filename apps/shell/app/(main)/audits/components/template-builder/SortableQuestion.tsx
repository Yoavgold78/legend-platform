import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export function SortableQuestion({ id, children, type, sectionId }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    // This tells dnd-kit what this item is and which section it belongs to
    data: {
      type,
      sectionId,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box {...listeners} {...attributes} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', paddingRight: 0.5 }}>
                <DragIndicatorIcon color="action" />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                {children}
            </Box>
        </Box>
    </div>
  );
}