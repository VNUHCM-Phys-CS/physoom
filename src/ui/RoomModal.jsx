import React, { useEffect } from "react";
import {
  Modal,
  Input,
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from "@heroui/react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roomSchema as schema } from "@/models/utils";
import { Plus, Trash, Trash2Icon } from "lucide-react";
import { locationList, categoryList } from "@/models/ulti";
import { toast } from "react-toastify";

const RoomModal = ({ data, isOpen, onOpenChange, onSave = () => {} }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {},
    resolver: zodResolver(schema),
  });

  // Reset form values whenever `data` changes
  useEffect(() => {
    if (data) {
      reset(data);
    } else {
      reset();
    }
  }, [data, reset]);

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Validate the combination of course_id and class_id
      const validateResponse = await fetch("/api/room/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: data?._id,
          title: formData.title,
          location: formData.location,
        }),
      });

      const validateData = await validateResponse.json();

      if (!validateResponse.ok || !validateData.isValid) {
        toast.error(
          validateData.message || "Validation failed. Please try again."
        );
        return;
      }
      // Save the data
      const endpoint = data?._id ? `/api/room/${data._id}` : `/api/room/create`;
      const method = data?._id ? "PUT" : "POST";

      const saveResponse = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        toast.error(saveData.message || "Failed to save the data.");
        return;
      }

      toast.success("Data saved successfully!");
      onSave(); // Callback to refresh the parent component
      onOpenChange(false); // Close the modal
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              <h3 id="modal-title">{data ? "Update Room" : "Create Room"}</h3>
            </ModalHeader>
            <ModalBody>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label="Title"
                    placeholder="Enter room title"
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    required
                  />
                )}
              />
              <Controller
                name="limit"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label="Capacity Limit"
                    placeholder="Enter capacity limit"
                    errorMessage={errors.limit?.message}
                    isInvalid={!!errors.limit}
                    required
                    onChange={(e) => {
                      // Ensure the value is parsed as an integer
                      field.onChange(parseInt(e.target.value, 10) || 0);
                    }}
                  />
                )}
              />
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Location"
                    placeholder="Select a location"
                    selectedKeys={[field.value]}
                    onChange={(val) => field.onChange(val)}
                  >
                    {locationList.short.map((loc) => (
                      <SelectItem key={loc}>{loc}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Category"
                    placeholder="Select a category"
                    selectedKeys={field.value || []}
                    onChange={(val) => {
                      field.onChange(val.target.value.split(","));
                    }}
                    selectionMode="multiple"
                  >
                    {categoryList.short.map((cat) => (
                      <SelectItem key={cat}>{cat}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label="Note"
                    placeholder="Enter any additional notes"
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button auto flat color="error" onPress={onClose}>
                Cancel
              </Button>
              <Button
                auto
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RoomModal;
