import { FormControl, FormLabel, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../components/DialogCustom";
import styles from "../../../Bot/components/AddBot/AddBot.module.scss"
import { addMessageToast } from "../../../../store/slices/Toast";
import { closeLimit, getPriceLimitCurrent } from "../../../../services/positionService";
import { useEffect, useState } from "react";

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

    const [priceCurrent, setPriceCurrent] = useState(0);
    const dispatch = useDispatch();

    const handleSubmitLimit = async (data) => {

        try {
            const res = await closeLimit({
                positionData,
                Quantity: positionData.Quantity,
                Price: priceCurrent
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status,
                message,
            }))

            if (status === 200) {
                handleClose(true)
            }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Close Market Error",
            }))
        }
    }

    const handleClose = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
    }

    const handleGetPriceCurrent = async () => {
        try {
            const symbol = positionData.Symbol
            const res = await getPriceLimitCurrent(symbol)
            const { status, message, data: resData } = res.data
            console.log(res.data);
            if (status === 200) {
                setPriceCurrent(resData)
            }

            dispatch(addMessageToast({
                status,
                message,
            }))

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Price Current Error",
            }))
        }
    }
    useEffect(() => {
        handleGetPriceCurrent()
    }, []);

    return (
        <DialogCustom
            dialogTitle="Close Limit"
            open={true}
            onClose={() => { handleClose(false) }}
            onSubmit={handleSubmit(handleSubmitLimit)}
            reserveBtn
            submitBtnColor="warning"
        >
            {
               <form className={styles.dialogForm}>
                    <FormControl className={styles.formControl}>
                        <FormLabel className={styles.label}>Price</FormLabel>
                        <TextField
                            {...register("Price", { required: true })}
                            type="number"
                            size="small"
                            value={priceCurrent}
                            onChange = {e=>{
                                setPriceCurrent(e.target.value)
                            }}
                        />
                        {errors.Price && <p className="formControlErrorLabel">The Price field is required.</p>}

                    </FormControl>
                    <FormControl className={styles.formControl}>
                        <FormLabel className={styles.label}>Quantity</FormLabel>
                        <TextField
                            {...register("Quantity")}
                            type="number"
                            size="small"
                            value={Math.abs(positionData.Quantity)}
                            disabled
                        />
                        {errors.Quantity && <p className="formControlErrorLabel">The Quantity field is required.</p>}

                    </FormControl>
                </form>
            }
        </DialogCustom>
    );
}

export default AddLimit;