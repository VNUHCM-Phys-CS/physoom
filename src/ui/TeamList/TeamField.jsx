"use client";
import { useFieldArray } from "react-hook-form";
const TeamField = ({ name, register, error, control, title, defaultValue={} }) => {
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
          const errorForname = error?.[index]?.name;
          return (
            <div className="bg-slate-300/50 p-3 rounded-lg">
              <div className="flex h-16 items-center gap-2" key={field.id}>
                <div className="w-1/4 my-32">
                  <input
                    {...register(`${name}.${index}.name`)}
                    placeholder="name"
                    defaultValue={field.name}
                    className="border p-2 border-gray-300 w-full"
                  />
                  <p>{errorForname?.message ?? <>&nbsp;</>}</p>
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
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() =>
          append(defaultValue)
        }
      >
        Append
      </button>
    </>
  );
};
export default TeamField;
