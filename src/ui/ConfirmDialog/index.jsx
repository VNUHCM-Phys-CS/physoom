"use client";

import { useCallback, useRef, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { AlertTriangleIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Promise-based confirmation dialog.
 *
 * Usage:
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   onPress={async () => {
 *     if (await confirm({ message: "Delete this event?" })) {
 *       await doDelete();
 *     }
 *   }}
 *   ...
 *   return (<>{confirmDialog} ...</>);
 */
export function useConfirm() {
  const { t } = useI18n();
  const [state, setState] = useState({ isOpen: false, options: {} });
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    setState({ isOpen: true, options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result) => {
    setState((s) => ({ ...s, isOpen: false }));
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  }, []);

  const {
    title = t("del.title"),
    message = t("del.permanent"),
    confirmLabel = t("common.delete"),
    cancelLabel = t("common.cancel"),
    confirmColor = "danger",
  } = state.options;

  const confirmDialog = (
    <Modal
      isOpen={state.isOpen}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      backdrop="blur"
      size="sm"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-danger">
          <AlertTriangleIcon size={20} />
          <span>{title}</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => close(false)}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onPress={() => close(true)}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return { confirm, confirmDialog };
}

export default useConfirm;
