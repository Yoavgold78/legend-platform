import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export function SortableSection({ id, children, type }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id,
    // This tells dnd-kit what kind of item this is
    data: {
      type,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box {...listeners} {...attributes} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', paddingRight: 0.5 }}>
                <DragIndicatorIcon />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                {children}
            </Box>
        </Box>
    </div>
  );
}