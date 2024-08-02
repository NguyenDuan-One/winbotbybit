import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, RadioGroup, FormControlLabel, Radio, MenuItem, Switch, InputAdornment } from "@mui/material";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import styles from "./CreateStrategy.module.scss"
import { createStrategiesSpot, getAllSymbolSpot } from "../../../../../../services/spotService";


function CreateStrategy({
    botListInput,
    onClose,
    symbolValueInput,
}) {

    const formControlMinValue = .1
    const groupList = [
        {
            name: "Group 1",
            value: "Group 1",
        }
    ]

    const positionSideList = [
        {
            name: "Both",
            value: "Both",
        },
        {
            name: "Long",
            value: "Long",
        },
        {
            name: "Short",
            value: "Short",
        },
    ]


    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();

    const [symbolGroupData, setSymbolGroupData] = useState(symbolValueInput ? [symbolValueInput] : [])
    const [botList, setBotList] = useState([])

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: "Symbol",
        list: []
    });

    const symbolListRef = useRef()

    const dispatch = useDispatch()

    const handleChangeRatio = (e) => {
        setSymbolGroupData([])
        const value = e.target.value
        setSymbolGroupDataList({
            label: value,
            list: value === "Group" ? groupList : symbolListRef.current
        })
    }

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllSymbolSpot()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => ({ name: item.split("USDT")[0], value: item }))

            symbolListRef.current = newSymbolList

            setSymbolGroupDataList({
                label: "Symbol",
                list: newSymbolList
            })
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Symbol Error",
            }))
        }
    }

    const handleSubmitCreate = async data => {
        let dataChange = false
        if (symbolGroupData.length > 0 && botList.length > 0) {
            try {
                const res = await createStrategiesSpot({
                    data: data,
                    botListId: botList.map(item => item.value),
                    [symbolGroupDataList.label]: symbolGroupData.map(item => item.value)
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    reset()
                    dataChange = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
            closeDialog(dataChange)
        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        reset()
    }

    useEffect(() => {
        handleGetSymbolList()
    }, []);


    return (
        <DialogCustom
            dialogTitle="Create Strategy ( Spot )"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bots</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={1}
                        value={botList}
                        disableCloseOnSelect
                        options={botListInput}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBotList(value)
                        }}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Select..." />
                        )}
                        renderOption={(props, option, { selected, index }) => (
                            <>
                                {index === 0 && (
                                    <>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBotList(botListInput)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBotList([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || botList.findIndex(item => item.value === option.value) > -1}
                                    />
                                    {option.name}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {errors.botID?.type === 'required' && <p className="formControlErrorLabel">The Bot field is required.</p>}
                    {isSubmitted && !botList.length && <p className="formControlErrorLabel">The Bot field is required.</p>}

                </FormControl>

                <FormControl className={styles.formControl} >
                    <RadioGroup
                        defaultValue="Symbol"
                        onChange={handleChangeRatio}
                        style={{
                            display: "flex",
                            flexDirection: "row"
                        }}
                    >
                        <FormControlLabel value="Symbol" control={<Radio />} label="Symbol" />
                        <FormControlLabel value="Group" control={<Radio />} label="Group" />
                    </RadioGroup>
                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>{symbolGroupDataList.label === "Group" ? "Group" : "Symbol"}</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={symbolGroupData}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setSymbolGroupData(value)
                        }}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Select..." />
                        )}
                        renderOption={(props, option, { selected, index }) => (
                            <>
                                {index === 0 && (
                                    <>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolGroupData(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolGroupData([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || symbolGroupData.findIndex(item => item.value === option.value) > -1}
                                    />
                                    {option.name}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {isSubmitted && !symbolGroupData.length && <p className="formControlErrorLabel">The {symbolGroupDataList.label} field is required.</p>}

                </FormControl>

                <div className={styles.formMainData}>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            select
                            label="Position side"
                            variant="outlined"
                            defaultValue={positionSideList[0].value}
                            size="medium"
                            {...register("PositionSide", { required: true, })}
                        >
                            {

                                positionSideList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="OC"
                            variant="outlined"
                            defaultValue={4}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>,
                            }}
                            {...register("OrderChange", { required: true, min: formControlMinValue })}
                        />
                        {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC field is required.</p>}
                        {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.1.</p>}
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Amount"
                            variant="outlined"
                            defaultValue={100}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Amount", { required: true, min: formControlMinValue })}
                        />
                        {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">The Amount field is required.</p>}
                        {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Auto amount percent"
                            variant="outlined"
                            defaultValue={80}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>
                            }}
                            {...register("AmountAutoPercent", { required: true, min: formControlMinValue })}
                        />
                        {errors.AmountAutoPercent?.type === 'required' && <p className="formControlErrorLabel">The AutoPercent field is required.</p>}
                        {errors.AmountAutoPercent?.type === "min" && <p className="formControlErrorLabel">The AutoPercent must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Amount expire"
                            variant="outlined"
                            defaultValue={50}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    min
                                </InputAdornment>
                            }}
                            {...register("AmountExpire", { required: true, min: formControlMinValue })}
                        />
                        {errors.AmountExpire?.type === 'required' && <p className="formControlErrorLabel">The Amount expire field is required.</p>}
                        {errors.AmountExpire?.type === "min" && <p className="formControlErrorLabel">The Amount expire must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Limit"
                            variant="outlined"
                            defaultValue={100}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Limit", { required: true, min: formControlMinValue })}
                        />
                        {errors.Limit?.type === 'required' && <p className="formControlErrorLabel">The Limit field is required.</p>}
                        {errors.Limit?.type === "min" && <p className="formControlErrorLabel">The Limit must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Amount increase OC"
                            variant="outlined"
                            defaultValue={100}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>
                            }}
                            {...register("AmountIncreaseOC", { required: true, min: formControlMinValue })}
                        />
                        {errors.AmountIncreaseOC?.type === 'required' && <p className="formControlErrorLabel">The IncreaseOC field is required.</p>}
                        {errors.AmountIncreaseOC?.type === "min" && <p className="formControlErrorLabel">The IncreaseOC must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Expire"
                            variant="outlined"
                            defaultValue={100}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    min
                                </InputAdornment>
                            }}
                            {...register("Expire", { required: true, min: formControlMinValue })}
                        />
                        {errors.Expire?.type === 'required' && <p className="formControlErrorLabel">The Expire field is required.</p>}
                        {errors.Expire?.type === "min" && <p className="formControlErrorLabel">The Expire must bigger 0.1.</p>}

                    </FormControl>


                    <div style={{
                        width: "100%",
                        display:"flex",
                        justifyContent: "space-between",
                        margin:"0 12px"
                    }}>
                        <FormControl className={clsx(styles.formControl)}>

                            <FormLabel className={styles.label}>IsActive</FormLabel>
                            <Switch
                                defaultChecked
                                title="IsActive"
                                {...register("IsActive")}
                            />
                        </FormControl>

                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Adaptive</FormLabel>
                            <Switch
                                defaultChecked
                                title="Adaptive"
                                {...register("Adaptive")}

                            />
                        </FormControl>

                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Reverse</FormLabel>
                            <Switch
                                title="Reverse"
                                {...register("Reverse")}

                            />
                        </FormControl>

                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                title="Remember"
                                {...register("Remember")}

                            />
                        </FormControl>
                    </div>
                </div>


            </form>
        </DialogCustom>
    );
}

export default CreateStrategy;