"use client";
import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
  cn,
} from "@heroui/react";
import { Trash2Icon, AlertTriangleIcon } from "lucide-react";

export default function DeleteConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  eventData,
}) {
  const [deleteMode, setDeleteMode] = useState("single");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(deleteMode, eventData);
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      backdrop="blur"
      size="md"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-danger">
                <Trash2Icon size={20} />
                <span>Confirm Deletion</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <p className="text-default-500">
                  How would you like to delete this schedule?
                </p>
                
                <RadioGroup
                  value={deleteMode}
                  onValueChange={setDeleteMode}
                  color="danger"
                >
                  <CustomRadio
                    value="single"
                    description="Delete only this specific occurrence."
                  >
                    This occurrence only
                  </CustomRadio>
                  <CustomRadio
                    value="future"
                    description="Delete this and all future occurrences in this series."
                  >
                    From this point forward
                  </CustomRadio>
                  <CustomRadio
                    value="series"
                    description="Delete the entire recurring series."
                  >
                    All occurrences
                  </CustomRadio>
                  <CustomRadio
                    value="course"
                    description="Remove all scheduled sessions for this course across all weekdays and rooms."
                  >
                    All schedules for this course
                  </CustomRadio>
                </RadioGroup>

                <div className="p-3 bg-danger-50 rounded-lg flex gap-3 border border-danger-100">
                  <AlertTriangleIcon className="text-danger flex-shrink-0" size={20} />
                  <p className="text-tiny text-danger-600">
                    This action is permanent and cannot be undone. All related data for the selected mode will be removed.
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="danger" 
                onPress={handleConfirm}
                isLoading={isLoading}
              >
                Confirm Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

const CustomRadio = (props) => {
  const { children, description, ...otherProps } = props;

  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
          "inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between",
          "flex-row-reverse max-w-full cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent",
          "data-[selected=true]:border-danger"
        ),
      }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-small font-medium">{children}</span>
        {description && (
          <span className="text-tiny text-default-400">{description}</span>
        )}
      </div>
    </Radio>
  );
};
