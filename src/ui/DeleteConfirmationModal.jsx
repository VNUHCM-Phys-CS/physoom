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
import { useI18n } from "@/i18n/I18nProvider";

export default function DeleteConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  eventData,
}) {
  const { t } = useI18n();
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
                <span>{t("del.title")}</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <p className="text-default-500">
                  {t("del.how")}
                </p>

                <RadioGroup
                  value={deleteMode}
                  onValueChange={setDeleteMode}
                  color="danger"
                >
                  <CustomRadio
                    value="single"
                    description={t("del.thisOnly")}
                  >
                    {t("del.thisOccurrence")}
                  </CustomRadio>
                  <CustomRadio
                    value="future"
                    description={t("del.thisFuture")}
                  >
                    {t("del.fromForward")}
                  </CustomRadio>
                  <CustomRadio
                    value="series"
                    description={t("del.series")}
                  >
                    {t("del.allOccurrences")}
                  </CustomRadio>
                  <CustomRadio
                    value="course"
                    description={t("del.course")}
                  >
                    {t("del.allCourse")}
                  </CustomRadio>
                </RadioGroup>

                <div className="p-3 bg-danger-50 rounded-lg flex gap-3 border border-danger-100">
                  <AlertTriangleIcon className="text-danger flex-shrink-0" size={20} />
                  <p className="text-tiny text-danger-600">
                    {t("del.permanentDetail")}
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                color="danger"
                onPress={handleConfirm}
                isLoading={isLoading}
              >
                {t("del.confirmDelete")}
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
