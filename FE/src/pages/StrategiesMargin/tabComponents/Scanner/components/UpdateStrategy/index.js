import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, MenuItem, Switch, InputAdornment, CircularProgress } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { getAllCoin, syncCoin } from "../../../../../../services/coinService"
import { createConfigScanner, updateConfigByID } from '../../../../../../services/scannerService';

function UpdateStrategy({
    onClose,
    dataInput,
    setDataCheckTree,
    dataCheckTreeDefaultRef
}) {

    const formControlMinValue = .1


    const marketList = [
        {
            name: "Margin",
            value: "Margin",
        },
        {
            name: "Spot",
            value: "Spot",
        },
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

    const [onlyPairsSelected, setOnlyPairsSelected] = useState(dataInput.OnlyPairs || [])
    const [blackListSelected, setBlackListSelected] = useState(dataInput.Blacklist || [])
    const [botList, setBotList] = useState([])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);

    const dataChangeRef = useRef(false)

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: "Symbol",
        list: []
    });

    const symbolListRef = useRef()

    const dispatch = useDispatch()

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllCoin()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))

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



    const handleSyncSymbol = async () => {
        if (!loadingSyncCoin) {
            try {
                setLoadingSyncCoin(true)
                const res = await syncCoin()
                const { status, message, data: resData } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))

                handleGetSymbolList()
                setLoadingSyncCoin(false)
            }
            catch (err) {
                setLoadingSyncCoin(false)
                dispatch(addMessageToast({
                    status: 500,
                    message: "Sync Error",
                }))
            }
        }
    }

    const handleSubmitCreate = async data => {

        const configID = dataInput._id
        const newData = {
            ...dataInput,
            ...data,
            Blacklist: blackListSelected.map(item=>item.value),
            OnlyPairs: onlyPairsSelected.map(item=>item.value)
        }
        try {
            const res = await updateConfigByID({
                newData,
                configID
            })
            const { status, message, data: symbolListDataRes } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message
            }))

            if (status === 200) {
                reset()
                dataChangeRef.current = true
                console.log(newData);
                

                setDataCheckTree(dataCheckTree => dataCheckTree.map(item => {
                    if (item._id === configID) {
                        return newData
                    }
                    return item
                }))
                dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(item => {
                    if (item._id === configID) {
                        return newData
                    }
                    return item
                })
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
        <DialogCustom
            dialogTitle="Update Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            submitBtnText='Update'
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>

                    <FormLabel className={styles.label}>Bot</FormLabel>
                    <TextField
                        variant="outlined"
                        value={dataInput.botID?.botName}
                        size="medium"
                        disabled
                    >
                    </TextField>

                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Label</FormLabel>
                    <TextField
                        defaultValue={dataInput.Label}
                        variant="outlined"
                        size="small"
                        {...register("Label",)}
                    >
                    </TextField>
                    {errors.Label?.type === 'required' && <p className="formControlErrorLabel">The Label field is required.</p>}
                </FormControl>

                <FormControl className={styles.formControl}>
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <FormLabel className={styles.label}>Only pairs</FormLabel>
                        <span style={{ marginRight: "6px" }}>
                            {
                                !loadingSyncCoin ?
                                    <CloudSyncIcon
                                        style={{
                                            cursor: "pointer",
                                            color: "#959595"
                                        }}
                                        onClick={handleSyncSymbol} />
                                    :
                                    <CircularProgress style={{ width: "16px", height: "16px" }} />
                            }
                        </span>
                    </div>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={onlyPairsSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setOnlyPairsSelected(value)
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
                                                setOnlyPairsSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setOnlyPairsSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || onlyPairsSelected.findIndex(item => item === option.value) > -1}
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
                    {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">The Only pairs field is required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Blacklist</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={blackListSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBlackListSelected(value)
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
                                                setBlackListSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBlackListSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || blackListSelected.findIndex(item => item === option.value) > -1}
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
                    {/* {isSubmitted && !blackListSelected.length && <p className="formControlErrorLabel">The Blacklist field is required.</p>} */}

                </FormControl>

                <div className={styles.formMainData}>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            label="Market"
                            variant="outlined"
                            value={dataInput.Market}
                            size="medium"
                            disabled
                        >
                            
                        </TextField>
                    </FormControl>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            label="Position side"
                            variant="outlined"
                            value={dataInput.PositionSide}
                            size="medium"
                            disabled
                        >
                            
                        </TextField>
                    </FormControl>


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="OC"
                            variant="outlined"
                            defaultValue={dataInput.OrderChange}
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
                            label="Elastic"
                            variant="outlined"
                            defaultValue={dataInput.Elastic}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>
                            }}
                            {...register("Elastic", { required: true, min: formControlMinValue })}
                        />
                        {errors.Elastic?.type === 'required' && <p className="formControlErrorLabel">The Elastic field is required.</p>}
                        {errors.Elastic?.type === "min" && <p className="formControlErrorLabel">The Elastic must bigger 0.1.</p>}

                    </FormControl>


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Amount"
                            variant="outlined"
                            defaultValue={dataInput.Amount}
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
                            label="Numbs"
                            variant="outlined"
                            defaultValue={dataInput.Numbs}
                            size="medium"
                            // InputProps={{
                            //     endAdornment: <InputAdornment position="end">
                            //         %
                            //     </InputAdornment>
                            // }}
                            {...register("Numbs", { required: true, min: formControlMinValue })}
                        />
                        {errors.Numbs?.type === 'required' && <p className="formControlErrorLabel">The Numbs field is required.</p>}
                        {errors.Numbs?.type === "min" && <p className="formControlErrorLabel">The Numbs must bigger 0.1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Expire"
                            variant="outlined"
                            defaultValue={dataInput.Expire}
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

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Limit"
                            variant="outlined"
                            defaultValue={dataInput.Limit}
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
                            label="Turnover"
                            variant="outlined"
                            defaultValue={dataInput.Turnover}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Turnover", { required: true, min: formControlMinValue })}
                        />
                        {errors.Turnover?.type === 'required' && <p className="formControlErrorLabel">The Turnover field is required.</p>}
                        {errors.Turnover?.type === "min" && <p className="formControlErrorLabel">The Turnover must bigger 0.1.</p>}

                    </FormControl>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>

                        <FormLabel className={styles.label}>IsActive</FormLabel>
                        <Switch
                            defaultChecked={dataInput.IsActive}
                            {...register("IsActive")}
                        />
                    </FormControl>
                </div>


            </form>
        </DialogCustom>
    );
}

export default UpdateStrategy;