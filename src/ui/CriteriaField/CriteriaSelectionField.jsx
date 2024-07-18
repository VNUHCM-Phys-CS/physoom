"use client";
import { useFieldArray } from "react-hook-form";
function CriteriaSelectionField({ name, register, error, control }) {
  const { fields, append, remove } = useFieldArray({
    name,
    control,
  });
  return (
    <>
      {fields.map((field, index) => {
        const errorForField = error?.[index].text;
        return (
          <div className="flex h-16 items-center gap-2" key={field.id}>
            <div className="grow my-32">
              <input
                {...register(`${name}.${index}.text`)}
                placeholder="Enter a text.."
                defaultValue={field.text}
                className="border p-2 border-gray-300 w-full"
              />
              <p>{errorForField?.message ?? <>&nbsp;</>}</p>
            </div>

            <div className="h-full flex justify-start items-start">
              <button
                type="button"
                className="btn bg-red-700 hover:bg-red-900 text-white"
                onClick={() => remove(index)}
              >
                x
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="block btn btn-primary"
        onClick={() => append({ text: "" })}
      >
        Append
      </button>
    </>
  );
}
export default CriteriaSelectionField;
