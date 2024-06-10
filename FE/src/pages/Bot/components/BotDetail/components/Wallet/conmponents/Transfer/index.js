import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./Transfer.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";

const botTypeList = [
    {
        name: "Forbid",
        value: "Forbid"
    },
    {
        name: "Frozen",
        value: "Frozen"
    }
]

function Transfer({
    open,
    onClose
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();
    const handleSubmitTransfer = data => {
    }

    const closeDialog = ()=>{
        onClose()
        reset()
    }

    return (
        <DialogCustom
            open={open}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitTransfer)}
            dialogTitle="Transfer"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>TransferFrom</FormLabel>
                    <Select
                        defaultValue={botTypeList[0].value}
                        size="small"
                        {...register("TransferFrom", { required: true })}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>TransferAmount</FormLabel>
                    <TextField
                        {...register("TransferAmount", { required: true })}
                         
                        size="small"
                    />
                    {errors.TransferAmount?.type === 'required' && <p className="formControlErrorLabel">The TransferAmount field is required.</p>}

                </FormControl>


            </form>
        </DialogCustom >
    );
}

export default memo(Transfer);