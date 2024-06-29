import { FormControl, FormLabel, TextField, Select, MenuItem } from "@mui/material";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../components/DialogCustom";
import styles from "../../../Bot/components/AddBot/AddBot.module.scss"

function AddLimit({
    onClose,
    positionData
}) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch();

    const handleSubmitLimit = async (data) => {
        console.log(positionData);
        console.log(data);
    }

    const handleClose = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
    }
    return (
        <DialogCustom
            dialogTitle="Close Limit"
            open={true}
            onClose={() => { handleClose(false) }}
            onSubmit={handleSubmit(handleSubmitLimit)}
            reserveBtn
            submitBtnColor="warning"
        >
            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Price</FormLabel>
                    <TextField
                        {...register("Price", { required: true })}
                        type="number"
                        size="small"
                    />
                    {errors.Price && <p className="formControlErrorLabel">The Price field is required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Quantity</FormLabel>
                    <TextField
                        {...register("Quantity", { required: true })}
                        type="number"
                        size="small"
                    />
                    {errors.Quantity && <p className="formControlErrorLabel">The Quantity field is required.</p>}

                </FormControl>


            </form>
        </DialogCustom>
    );
}

export default AddLimit;