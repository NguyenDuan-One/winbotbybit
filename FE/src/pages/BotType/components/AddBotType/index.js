import { FormControl, FormLabel, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useState } from "react";

import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";

import { createBotType } from "../../../../services/botTypeService";
import BottomSheetModal from "../../../../components/BottomSheetModal";

function AddBotType({
    onClose
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch();

    const handleSubmitAddGroup = async formData => {

        try {
            const res = await createBotType({
                ...formData,
                name: formData.name.trim()
            })

            const { message, status } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            status === 200 && closeDialog(true)
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Add Group Error",
            }))
        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        reset()
    }

    return (
        <BottomSheetModal
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitAddGroup)}
            dialogTitle="Add BotType"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("name", { required: true, pattern: /\S/ })}

                        size="small"
                    />
                    {errors.name && <p className="formControlErrorLabel">The Name field is required.</p>}

                </FormControl>


                <FormControl className={styles.formControl}>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Note</FormLabel>
                    <TextField
                        placeholder="Note"
                        multiline
                        rows={3}
                        {...register("note")}
                        size="small"
                    />
                </FormControl>

            </form>

        </BottomSheetModal >
    );
}

export default memo(AddBotType)