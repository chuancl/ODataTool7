
import React from 'react';
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Trash, Save, Pencil, Check, X, Plus, Settings2 } from 'lucide-react';

interface TableHeaderProps {
    isRoot: boolean;
    isEditing: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onConfirmUpdate: () => void;
    onDelete: () => void;
    onExport: () => void;
    onCreate?: () => void;
    enableEdit?: boolean;
    enableDelete?: boolean;
    hideUpdateButton?: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
    isRoot,
    isEditing,
    onStartEdit,
    onCancelEdit,
    onConfirmUpdate,
    onDelete,
    onExport,
    onCreate,
    enableEdit = true,
    enableDelete = true,
    hideUpdateButton = false
}) => {
    if (!isRoot) return null;

    return (
        <div className="flex gap-4 items-center justify-between shrink-0 mb-1 px-1">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-small font-bold text-default-700">
                    <Settings2 size={16} className="text-primary"/>
                    <span>Data Actions</span>
                </div>
                {isEditing && (
                    <Chip size="sm" color="warning" variant="flat" className="h-5 text-[10px]">Editing Mode</Chip>
                )}
             </div>
             
             <div className="flex gap-2">
                {onCreate && (
                    <Button size="sm" color="primary" variant="shadow" className="font-medium" onPress={onCreate} startContent={<Plus size={14} />}>
                        Create Selected
                    </Button>
                )}

                {enableEdit && !isEditing && (
                    <Button size="sm" variant="flat" className="bg-default-100 hover:bg-default-200" onPress={onStartEdit} startContent={<Pencil size={14} />}>
                        Edit
                    </Button>
                )}

                {enableEdit && isEditing && (
                    <>
                        {!hideUpdateButton && (
                            <Button size="sm" color="success" variant="shadow" className="text-white font-medium" onPress={onConfirmUpdate} startContent={<Check size={14} />}>
                                Save Changes
                            </Button>
                        )}
                        <Button size="sm" color="danger" variant="flat" onPress={onCancelEdit} startContent={<X size={14} />}>
                            Cancel
                        </Button>
                    </>
                )}
                
                {enableDelete && (
                    <Button size="sm" color="danger" variant="ghost" onPress={onDelete} startContent={<Trash size={14} />}>
                        Delete
                    </Button>
                )}

                <Button size="sm" variant="bordered" className="border-default-200" onPress={onExport} startContent={<Save size={14} />}>
                    Export
                </Button>
            </div>
        </div>
    );
};
