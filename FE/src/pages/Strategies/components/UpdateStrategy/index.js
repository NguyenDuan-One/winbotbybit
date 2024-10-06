import { useForm } from "react-hook-form";
import DialogCustom from "../../../../components/DialogCustom";
import { FormControl, FormLabel, Switch, TextField } from "@mui/material";
import clsx from "clsx";
import styles from "../CreateStrategy/CreateStrategy.module.scss"
import { updateStrategiesByID } from "../../../../services/dataCoinByBitService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { useRef } from "react";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import IOSSwitch from "../../../../components/SwitchCustomer";

function UpdateStrategy({
    onClose,
    treeNodeValue,
    symbolValue,
    handleUpdateDataAfterSuccess
}) {
    const formControlMinValue = .1

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const formDataChangeRef = useRef(false)

    const handleSubmitUpdate = async data => {
        let dataChange = false
        if (formDataChangeRef.current) {

            const { parentID, ...dataTreeNode } = treeNodeValue

            const newData = {
                ...dataTreeNode,
                ...data
            }

            try {
                const res = await updateStrategiesByID({
                    id: newData._id,
                    data: {
                        parentID,
                        newData,
                        symbol: symbolValue
                    }
                })
                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                if (status === 200) {
                    dataChange = true
                    handleUpdateDataAfterSuccess(newData)
                }

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Edit Error",
                }))
            }
        }
        closeDialog(dataChange)

    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
    }


    return (
        <BottomSheetModal
            dialogTitle="Update Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitUpdate)}
            maxWidth="sm"
        >

            <form className={styles.dialogForm} onChange={e => {
                formDataChangeRef.current = true
            }}>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Bot</FormLabel>
                    <TextField
                        variant="outlined"
                        value={treeNodeValue.botID?.botName}
                        size="small"
                        disabled
                    >
                    </TextField>
                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <TextField
                        variant="outlined"
                        value={symbolValue}
                        size="small"
                        disabled
                    >
                    </TextField>
                </FormControl>

                <div className={styles.formMainData}>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <FormLabel className={styles.label}>Position side</FormLabel>
                        <TextField
                            variant="outlined"
                            value={treeNodeValue.PositionSide}
                            size="small"
                            disabled
                        />
                    </FormControl>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Candlestick</FormLabel>
                        <TextField
                            variant="outlined"
                            value={treeNodeValue.Candlestick}
                            size="small"
                            disabled
                        />
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Order change</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.OrderChange}
                            size="small"
                            {...register("OrderChange", { required: true, min: formControlMinValue })}
                        />
                        {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The Order Change field is required.</p>}
                        {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Extended OC percent</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.ExtendedOCPercent}
                            size="small"
                            {...register("ExtendedOCPercent", { required: true, min: formControlMinValue })}
                        />
                        {errors.ExtendedOCPercent?.type === 'required' && <p className="formControlErrorLabel">The Extended OC percent field is required.</p>}
                        {errors.ExtendedOCPercent?.type === "min" && <p className="formControlErrorLabel">The Extended must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Take profit</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.TakeProfit}
                            size="small"
                            {...register("TakeProfit", { required: true, min: formControlMinValue })}
                        />
                        {errors.TakeProfit?.type === 'required' && <p className="formControlErrorLabel">The Take profit field is required.</p>}
                        {errors.TakeProfit?.type === "min" && <p className="formControlErrorLabel">The TP must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Reduce take profit</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.ReduceTakeProfit}
                            size="small"
                            {...register("ReduceTakeProfit", { required: true, min: formControlMinValue })}
                        />
                        {errors.ReduceTakeProfit?.type === 'required' && <p className="formControlErrorLabel">The Reduce take profit field is required.</p>}
                        {errors.ReduceTakeProfit?.type === "min" && <p className="formControlErrorLabel">The Reduce TP must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Amount</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.Amount}
                            size="small"
                            {...register("Amount", { required: true, min: formControlMinValue })}
                        />
                        {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">The Amount field is required.</p>}
                        {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Ignore</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.Ignore}
                            size="small"
                            {...register("Ignore", { required: true, min: formControlMinValue })}
                        />
                        {errors.Ignore?.type === 'required' && <p className="formControlErrorLabel">The Ignore field is required.</p>}
                        {errors.Ignore?.type === "min" && <p className="formControlErrorLabel">The Ignore must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Entry Trailing</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            size="small"
                            defaultValue={treeNodeValue.EntryTrailing}
                            {...register("EntryTrailing", { min: formControlMinValue })}
                        />
                        {/* {errors.EntryTrailing?.type === 'required' && <p className="formControlErrorLabel">The Entry Trailing field is required.</p>} */}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Stop Lose</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={treeNodeValue.StopLose}
                            size="small"
                            {...register("StopLose", { required: true, min: formControlMinValue })}
                        />
                        {errors.StopLose?.type === 'required' && <p className="formControlErrorLabel">The Stop Lose field is required.</p>}
                        {errors.StopLose?.type === "min" && <p className="formControlErrorLabel">The StopLose must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%" }}>

                        <FormLabel className={styles.label}>IsActive</FormLabel>
                        <IOSSwitch
                            defaultChecked={treeNodeValue.IsActive}
                            title="IsActive"
                            {...register("IsActive")}

                        />
                    </FormControl>


                    <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%" }}>
                        <FormLabel className={styles.label}>Remember</FormLabel>
                        <IOSSwitch
                            defaultChecked={treeNodeValue.Remember}
                            title="Nhớ"
                            {...register("Remember")}

                        />
                    </FormControl>
                </div>


            </form>
        </BottomSheetModal>
    );
}

export default UpdateStrategy;