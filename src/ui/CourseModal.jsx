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
import LecturerEmailInput from "./LecturerEmailInput";
import { useI18n } from "@/i18n/I18nProvider";

const CourseModal = ({ data, isOpen, onOpenChange, onSave = () => {}, terms = [] }) => {
  const { t } = useI18n();
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
    name: "teacher_email",
  });
  const {
    fields: fields_classID,
    append: append_classID,
    remove: remove_classID,
  } = useFieldArray({
    control,
    name: "class_id",
  });

  // Reset form values whenever `data` changes
  useEffect(() => {
    if (data) {
      reset({
        ...data,
        term: data.term ? String(data.term) : "",
        start_date: data.start_date
          ? new Date(data.start_date).toISOString().slice(0, 10) // Extract YYYY-MM-DD
          : "",
      });
    } else {
      reset({ teacher_email: [""], class_id: [""] }); // Default to one empty email field
    }
  }, [data, reset]);

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    // Empty / "unassign" term → null (avoid casting "" to an ObjectId).
    if (!formData.term || formData.term === "__none__") formData.term = null;
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
          course_id_extend: formData.course_id_extend,
          class_id: formData.class_id,
        }),
      });

      const validateData = await validateResponse.json();

      if (!validateResponse.ok || !validateData.isValid) {
        toast.error(
          validateData.message || t("course.validationFailed")
        );
        return;
      }
      // Save the data
      const endpoint = data?._id
        ? `/api/course/${data._id}`
        : `/api/course/create`;
      const method = data?._id ? "PUT" : "POST";

      const saveResponse = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data?._id ? formData : [formData]),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        toast.error(saveData.message || t("course.saveFailed"));
        return;
      }

      toast.success(t("course.saved"));
      onSave(); // Callback to refresh the parent component
      onOpenChange(false); // Close the modal
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error(t("course.unexpectedError"));
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
              <h3 id="modal-title">{data ? t("course.updateData") : t("course.createData")}</h3>
            </ModalHeader>
            <ModalBody>
              <Controller
                name="course_id"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label={t("course.courseId")}
                    placeholder={t("course.courseId")}
                    errorMessage={errors.course_id?.message}
                    isInvalid={!!errors.course_id}
                    required
                  />
                )}
              />
              <Controller
                name="course_id_extend"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label={t("course.courseIdExt")}
                    placeholder={t("course.courseIdExt")}
                    errorMessage={errors.course_id_extend?.message}
                    isInvalid={!!errors.course_id_extend}
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
                    label={t("form.title")}
                    placeholder={t("form.title")}
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    required
                  />
                )}
              />

              <div>
                <label>{t("course.classId")}</label>
                {fields_classID.map((field, index) => (
                  <div
                    key={field.id}
                    style={{ display: "flex", marginBottom: 8 }}
                  >
                    <Controller
                      name={`class_id.${index}`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder={`class_id ${index + 1}`}
                          errorMessage={
                            errors.class_id?.[index]?.message || "Required"
                          }
                          isInvalid={!!errors.class_id?.[index]}
                          required
                          style={{ flex: 1 }}
                        />
                      )}
                    />
                    <Button
                      variant="flat"
                      isIconOnly
                      color="danger"
                      onPress={() => remove_classID(index)}
                      style={{ marginLeft: 4 }}
                    >
                      <Trash2Icon size={15} />
                    </Button>
                  </div>
                ))}
                <Button auto flat onPress={() => append_classID("")}>
                  <Plus /> {t("course.addClassId")}
                </Button>
              </div>
              <div>
                <label>{t("course.teacherEmails")}</label>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    style={{ display: "flex", marginBottom: 8 }}
                  >
                    <Controller
                      name={`teacher_email.${index}`}
                      control={control}
                      render={({ field }) => (
                        <LecturerEmailInput
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={`Email ${index + 1}`}
                          errorMessage={
                            errors.teacher_email?.[index]?.message || "Required"
                          }
                          isInvalid={!!errors.teacher_email?.[index]}
                          required
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
                  <Plus /> {t("cm.addEmail")}
                </Button>
              </div>
              <Controller
                name="population"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label={t("cm.population")}
                    placeholder={t("cm.enterPopulation")}
                    errorMessage={errors.population?.message}
                    isInvalid={!!errors.population}
                    onChange={(e) => {
                      // Ensure the value is parsed as an integer
                      field.onChange(parseInt(e.target.value, 10) || 0); // Default to 0 if the value is NaN
                    }}
                  />
                )}
              />
              {/* Start date is NOT editable here: it's set by scheduling/import and
                  moving it re-generates the whole series. Editing it by hand in
                  this form caused accidental reschedules, so the field is removed.
                  The existing value is preserved unchanged on save. */}
              <Controller
                name="credit"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label={t("cm.credit")}
                    placeholder={t("cm.enterCredit")}
                    errorMessage={errors.credit?.message}
                    isInvalid={!!errors.credit}
                    required
                    onChange={(e) => {
                      let value = parseFloat(e.target.value);
                      if (isNaN(value)) value = 1; // default if empty/invalid
                      value = Math.round(value * 10) / 10; // limit to 1 decimal
                      field.onChange(value);
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
                    label={t("cm.duration")}
                    placeholder={t("cm.enterDuration")}
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
                    label={t("cm.location")}
                    placeholder={t("cm.selectLocation")}
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
                name="term"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t("cm.term") || "Học kỳ"}
                    placeholder={t("cm.selectTerm") || "Chọn học kỳ"}
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(val) => field.onChange(val.target.value)}
                  >
                    {[
                      ...(terms ?? []).map((tm) => (
                        <SelectItem key={String(tm._id)}>{tm.title}</SelectItem>
                      )),
                      <SelectItem key="__none__" className="text-danger">— Gỡ học kỳ —</SelectItem>,
                    ]}
                  </Select>
                )}
              />
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t("cm.category")}
                    placeholder={t("cm.selectCategory")}
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
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    clearable
                    label={t("cm.note")}
                    placeholder={t("cm.enterNote")}
                    errorMessage={errors.note?.message}
                    isInvalid={!!errors.note}
                    required
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button auto flat color="error" onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                auto
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {t("common.save")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CourseModal;
