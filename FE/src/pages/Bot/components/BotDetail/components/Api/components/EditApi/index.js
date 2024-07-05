import { FormControl, FormLabel, Switch, TextField } from "@mui/material";
import styles from "./EditApi.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { updateBot } from "../../../../../../../../services/botService";

function EditApi({
    open,
    botData,
    onClose
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const handleSubmitEditApi = async data => {

        try {
            data = {
                ...data,
                ApiKey: data.ApiKey.trim(),
                SecretKey: data.SecretKey.trim()
            }
            const res = await updateBot(
                {
                    id: botData._id,
                    data: {
                        ...data,
                        type: "Api",
                        checkBot: botData.Status === "Running"
                    }
                }
            )

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
                message: "Update Api Error",
            }))
        }
    }


    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            confirm: false,
            dataChange
        })
        reset()
    }


    return (
        <DialogCustom
            open={open}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitEditApi)}
            dialogTitle="Update Api"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>ApiKey</FormLabel>
                    <TextField
                        {...register("ApiKey", { required: true })}
                        size="small"
                    />
                    {errors.ApiKey?.type === 'required' && <p className="formControlErrorLabel">The ApiKey field is required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>SecretKey</FormLabel>
                    <TextField
                        {...register("SecretKey", { required: true })}
                        size="small"
                    />
                    {errors.SecretKey?.type === 'required' && <p className="formControlErrorLabel">The SecretKey field is required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>UTA</FormLabel>
                    <Switch
                        title="UTA"
                        defaultChecked={botData.UTA}
                        {...register("UTA")}

                    />
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(EditApi);