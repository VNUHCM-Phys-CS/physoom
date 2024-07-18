"use client";
import { useFieldArray } from "react-hook-form";
import CriteriaSelectionField from "./CriteriaSelectionField";
const CriteriaField = ({ name, register, error, control, title }) => {
  const { fields, append, remove } = useFieldArray({
    name,
    control,
  });

  return (
    <>
      {title && <label className="-mb-2">{title}</label>}
      <div className="flex flex-col gap-2 mt-2">
        {fields.map((field, index) => {
          const errorForField = error?.[index]?.quote;
          const errorForcid = error?.[index]?.cid;
          return (
            <div className="bg-slate-300/50 p-3 rounded-lg">
              <div className="flex h-16 items-center gap-2" key={field.id}>
                <div className="w-1/4 my-32">
                  <input
                    {...register(`${name}.${index}.cid`)}
                    placeholder="id"
                    defaultValue={field.cid}
                    className="border p-2 border-gray-300 w-full"
                  />
                  <p>{errorForcid?.message ?? <>&nbsp;</>}</p>
                </div>

                <div className="grow my-32">
                  <input
                    {...register(`${name}.${index}.quote`)}
                    placeholder="Enter a text.."
                    defaultValue={field.quote}
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
              <div className="pl-8 pr-1">
                <div className=" bg-slate-400/50 p-3  rounded-lg">
                  <CriteriaSelectionField
                    name={`${name}.${index}.selection`}
                    register={register}
                    error={error?.[index]?.selection}
                    control={control}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() =>
          append({
            cid: "",
            quote: "",
          })
        }
      >
        Append
      </button>
    </>
  );
};
export default CriteriaField;
