import { FormControl, FormLabel, Switch, TextField } from "@mui/material";
import styles from "./AddApi.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import BottomSheetModal from "../../../../../../../../components/BottomSheetModal";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { updateBot } from "../../../../../../../../services/botService";

function AddApi({
    open,
    onClose,
    checkBot,
    botType
}, ref) {

    const { botID } = useParams()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const handleSubmitAddApi = async data => {

        try {

            const res = await updateBot({
                data: {
                    ...data,
                    ApiKey: data.ApiKey?.trim(),
                    SecretKey: data.SecretKey?.trim(),
                    type: "Api",
                    checkBot,
                    botType
                },
                id: botID
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
                message: "Add Api Error",
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
            open={open}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitAddApi)}
            dialogTitle="Add Api"
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
                        {...register("UTA")}

                    />
                </FormControl>

            </form>
        </BottomSheetModal >
    );
}

export default memo(AddApi);