"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {teamListSchema} from "./teamListschema"
import TeamField from "./TeamField";
import {useMemo} from 'react';
const defaultValue = {name: "",
    order: 0,
    member: []
};
const TeamList = ({ userid, value }) => {
    const router = useRouter();
    const {
      register,
      formState: { errors, success, isDirty, isValid, isValidating },
      handleSubmit,
      control,
      setError,
    } = useForm({
      mode: "onChange",
      defaultValues: useMemo(() => {
            return value;
        }, [value]),
      resolver: zodResolver(teamListSchema, undefined, { rawValues: true }),
    });
    const onSubmit = async (data) => {
        try {
            if (res.status !== 200) {
                console.log("Something wrong");
            } else router.back();
        } catch (error) {
            console.log(error);
            console.log("Something wrong");
        }
    };
    const isSubmittable = !!isDirty && !!isValid;
    return (
        <form id="newlist" className="form" onSubmit={handleSubmit(onSubmit)}>
            <input type="file"></input>
            {/* <TeamField
                name="presentation"
                register={register}
                control={control}
                error={errors?.presentation}
                defaultValue={defaultValue}
            /> */}
            <div className="flex justify-between">
                <button
                form="newlist"
                type="submit"
                disabled={!isSubmittable}
                className="btn btn-primary"
                >
                Save
                </button>
                <button onClick={()=>router.back()} className="btn ">
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default TeamList;