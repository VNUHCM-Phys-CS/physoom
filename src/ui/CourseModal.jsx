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
import { courseSchema as schema } from "@/models/utils";
import { Plus, Trash, Trash2Icon } from "lucide-react";
import { categoryList, locationList } from "@/models/ulti";
import { toast } from "react-toastify";

const CourseModal = ({ data, isOpen, onOpenChange, onSave = () => {} }) => {
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "teacher_email", // Name of the field to manage
  });

  // Reset form values whenever `data` changes
  useEffect(() => {
    if (data) {
      reset({
        ...data,
        start_date: data.start_date
          ? new Date(data.start_date).toISOString().slice(0, 10) // Extract YYYY-MM-DD
          : "",
      });
    } else {
      reset({ teacher_email: [""] }); // Default to one empty email field
    }
  }, [data, reset]);

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Validate the combination of course_id and class_id
      const validateResponse = await fetch("/api/course/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: data?._id,
          course_id: formData.course_id,
          class_id: formData.class_id,
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
      const endpoint = data?._id
        ? `/api/course/${data._id}`
        : `/api/course/create`;
      const method = data._id ? "PUT" : "POST";

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
              <h3 id="modal-title">{data ? "Update Data" : "Create Data"}</h3>
            </ModalHeader>
            <ModalBody>
              <Controller
                name="course_id"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label="Course ID"
                    placeholder="Enter Course ID"
                    errorMessage={errors.course_id?.message}
                    isInvalid={!!errors.course_id}
                    required
                  />
                )}
              />
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label="Title"
                    placeholder="Enter title"
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    required
                  />
                )}
              />
              <Controller
                name="class_id"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label="Class ID"
                    placeholder="Enter Class ID"
                    errorMessage={errors.class_id?.message}
                    isInvalid={!!errors.class_id}
                    required
                  />
                )}
              />
              <div>
                <label>Teacher Emails</label>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    style={{ display: "flex", marginBottom: 8 }}
                  >
                    <Controller
                      name={`teacher_email.${index}`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder={`Email ${index + 1}`}
                          errorMessage={
                            errors.teacher_email?.[index]?.message || "Required"
                          }
                          isInvalid={!!errors.teacher_email?.[index]}
                          required
                          style={{ flex: 1 }}
                        />
                      )}
                    />
                    <Button
                      variant="flat"
                      isIconOnly
                      color="danger"
                      onPress={() => remove(index)}
                      style={{ marginLeft: 4 }}
                    >
                      <Trash2Icon size={15} />
                    </Button>
                  </div>
                ))}
                <Button auto flat onPress={() => append("")}>
                  <Plus /> Add Email
                </Button>
              </div>
              <Controller
                name="population"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label="Population"
                    placeholder="Enter population"
                    errorMessage={errors.population?.message}
                    isInvalid={!!errors.population}
                    onChange={(e) => {
                      // Ensure the value is parsed as an integer
                      field.onChange(parseInt(e.target.value, 10) || 0); // Default to 0 if the value is NaN
                    }}
                  />
                )}
              />
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    label="Start Date"
                    errorMessage={errors.start_date?.message}
                    isInvalid={!!errors.start_date}
                    required
                  />
                )}
              />
              <Controller
                name="credit"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label="Credit"
                    placeholder="Enter credits"
                    errorMessage={errors.credit?.message}
                    isInvalid={!!errors.credit}
                    required
                    onChange={(e) => {
                      // Ensure the value is parsed as an integer
                      field.onChange(parseInt(e.target.value, 10) || 1); // Default to 0 if the value is NaN
                    }}
                  />
                )}
              />
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label="Duration"
                    placeholder="Enter duration in weeks"
                    errorMessage={errors.duration?.message}
                    isInvalid={!!errors.duration}
                    required
                    onChange={(e) => {
                      // Ensure the value is parsed as an integer
                      field.onChange(parseInt(e.target.value, 10) || 1); // Default to 0 if the value is NaN
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
                    selectedKeys={field.value}
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

export default CourseModal;
