import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useRef } from "react";
import { createBot } from "../../../../services/botService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import BottomSheetModal from "../../../../components/BottomSheetModal";

function AddBot({
    open,
    onClose,
    roleName,
    botTypeList
}, ref) {

    
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch();

    const newBotDataRef = useRef()

    const checkRoleNameAdmin = ()=>{
        // return roleName === "Admin" || roleName === "SuperAdmin"
        return roleName !== "Trader"
    }

    const handleSubmitAddBot = async formData => {

        try {
            const res = await createBot({
                ...formData,
                Status: checkRoleNameAdmin() ? "Stopped" : "Pending",
            })

            const { message, data: resData, status } = res.data

            resData && (newBotDataRef.current = resData)
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Add Bot Error",
            }))
        }
        closeDialog()
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: newBotDataRef.current
        })
        reset()
    }

    return (
        <BottomSheetModal
            open={open}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Add Bot"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("botName", { required: true, pattern: /\S/ })}

                        size="small"
                    />
                    {errors.botName && <p className="formControlErrorLabel">The Bot Name field is required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <Select
                        size="small"
                        {...register("botType", { required: true })}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                    {errors.botType && <p className="formControlErrorLabel">The Bot Type field is required.</p>}
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

export default memo(AddBot)