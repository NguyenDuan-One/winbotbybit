import { useForm } from "react-hook-form";
import DialogCustom from "../../../../components/DialogCustom";
import IOSSwitch from "../../../../components/SwitchCustomer";
import styles from "./CreateStrategy.module.scss"
import { Autocomplete, Button, Checkbox, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, Select, Switch, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { createStrategies, getAllSymbol } from "../../../../services/dataCoinByBitService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import { Margin } from "@mui/icons-material";

function CreateStrategy({
    botListInput,
    onClose,
    symbolValueInput,
}) {

    console.log(symbolValueInput);

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

    const candlestickList = [
        {
            name: "1m",
            value: "1m",
        },
        {
            name: "3m",
            value: "3m",
        },
        {
            name: "5m",
            value: "5m",
        },
        {
            name: "15m",
            value: "15m",
        },
        // {
        //     name: "30m",
        //     value: "30m",
        // },
        // {
        //     name: "60m",
        //     value: "60m",
        // },
    ]

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();

    const [symbolGroupData, setSymbolGroupData] = useState(symbolValueInput || [])
    const [botList, setBotList] = useState([])

    const dataChangeRef = useRef(false)

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
            const res = await getAllSymbol()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => ({ name: item, value: item }))

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

        if (symbolGroupData.length > 0 && botList.length > 0) {
            try {
                const res = await createStrategies({
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
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
            closeDialog()
        }
    }

    const handleSubmitCreateWithAddMore = async data => {

        if (symbolGroupData.length > 0 && botList.length > 0) {
            try {
                const res = await createStrategies({
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
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
        }
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: dataChangeRef.current
        })
        reset()
    }

    useEffect(() => {
        handleGetSymbolList()
    }, []);


    return (
        <BottomSheetModal
            dialogTitle="Create Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            // addMore
            // addMoreFuntion={handleSubmit(handleSubmitCreateWithAddMore)}
            height={70}
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
                <div style={{ alignItems: "center", display: "flex" }}>
                    <FormControl className={styles.formControl} style={{ flexBasis: "56%" }}>
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

                    <div style={{ flexBasis: "40%", alignItems: "center", display: "flex" }}>
                        <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%", marginRight: "10px" }}>
                            <FormControlLabel control={<IOSSwitch
                                defaultChecked
                                title="IsActive"
                                {...register("IsActive")}
                            />} label="Active"></FormControlLabel>

                        </FormControl>

                        <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%" }}>
                            <FormControlLabel control={<IOSSwitch
                                title="Nhớ"
                                {...register("Remember")}

                            />} label="Nhớ"></FormControlLabel>

                        </FormControl>
                    </div>
                </div>
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
                                    {option.name.split("USDT")[0]}
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
                        <FormLabel className={styles.label}>Position side</FormLabel>
                        <TextField
                            select
                            hiddenLabel
                            defaultValue={positionSideList[0].value}
                            size="small"
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
                        <FormLabel className={styles.label}>Candlestick</FormLabel>
                        <TextField
                            select
                            hiddenLabel
                            defaultValue={candlestickList[0].value}
                            size="small"
                            {...register("Candlestick", { required: true, })}
                        >
                            {

                                candlestickList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Order change</FormLabel>
                        <TextField
                            type='number'
                            hiddenLabel
                            variant="outlined"
                            defaultValue={4}
                            size="small"
                            {...register("OrderChange", { required: true, min: formControlMinValue })}
                        />
                        {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC field is required.</p>}
                        {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Order change</FormLabel>
                        <TextField
                            hiddenLabel
                            type='number'
                            variant="outlined"
                            defaultValue={80}
                            size="small"
                            {...register("ExtendedOCPercent", { required: true, min: formControlMinValue })}
                        />
                        {errors.ExtendedOCPercent?.type === 'required' && <p className="formControlErrorLabel">The Extended field is required.</p>}
                        {errors.ExtendedOCPercent?.type === "min" && <p className="formControlErrorLabel">The Extended must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Take profit</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={50}
                            size="small"
                            {...register("TakeProfit", { required: true, min: formControlMinValue })}
                        />
                        {errors.TakeProfit?.type === 'required' && <p className="formControlErrorLabel">The TP field is required.</p>}
                        {errors.TakeProfit?.type === "min" && <p className="formControlErrorLabel">The TP must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Reduce take profit</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={45}
                            size="small"
                            {...register("ReduceTakeProfit", { required: true, min: formControlMinValue })}
                        />
                        {errors.ReduceTakeProfit?.type === 'required' && <p className="formControlErrorLabel">The Reduce TP field is required.</p>}
                        {errors.ReduceTakeProfit?.type === "min" && <p className="formControlErrorLabel">The Reduce TP must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Amount</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={100}
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
                            defaultValue={85}
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
                            {...register("EntryTrailing", { min: formControlMinValue })}
                        />
                        {/* {errors.EntryTrailing?.type === 'required' && <p className="formControlErrorLabel">The Entry Trailing field is required.</p>} */}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                    <FormLabel className={styles.label}>Stop Lose</FormLabel>
                        <TextField
                            type='number'
                            variant="outlined"
                            defaultValue={50}
                            size="small"
                            {...register("StopLose", { required: true, min: 0.1 })}
                        />
                        {errors.StopLose?.type === 'required' && <p className="formControlErrorLabel">The StopLose field is required.</p>}
                        {errors.StopLose?.type === "min" && <p className="formControlErrorLabel">The StopLose must bigger 0.1.</p>}

                    </FormControl>

                    {/* <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%" }}>

                        <FormLabel className={styles.label}>IsActive</FormLabel>
                        <Switch
                            defaultChecked
                            title="IsActive"
                            {...register("IsActive")}

                        />
                    </FormControl>


                    <FormControl className={clsx(styles.formControl)} style={{ flexBasis: "48%" }}>
                        <FormLabel className={styles.label}>Remember</FormLabel>
                        <Switch
                            title="Remember"
                            {...register("Remember")}

                        />
                    </FormControl> */}
                </div>
            </form>
        </BottomSheetModal>
    );
}

export default CreateStrategy;