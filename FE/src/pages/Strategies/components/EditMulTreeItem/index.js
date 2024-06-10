import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useMemo, useRef, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { Checkbox, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../../store/slices/Toast';
import { deleteStrategiesMultiple, updateStrategiesMultiple } from '../../../../services/dataCoinByBitService';

function EditMulTreeItem({
    onClose,
    dataCheckTreeSelected,
    botList
}) {

    // dataCheckTreeSelected = [...new Set(dataCheckTreeSelected)]

    const compareFilterListDefault = [
        "=",
        "+",
        "-",
        "=%",
        "+%",
        "-%",
    ]

    const fieldFilterList = [

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Amount",
            value: "Amount",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "OC",
            value: "OrderChange",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Extended",
            value: "ExtendedOCPercent",
            compareFilterList: compareFilterListDefault,

        },

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "TP",
            value: "TakeProfit",
            compareFilterList: compareFilterListDefault,

        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Reduce",
            value: "ReduceTakeProfit",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Ignore",
            value: "Ignore",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Active",
            value: "IsActive",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "EntryTrailing",
            value: "EntryTrailing",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "StopLose",
            value: "StopLose",
            compareFilterList: compareFilterListDefault,
        },
    ]

    const [filterDataRowList, setFilterDataRowList] = useState([fieldFilterList[2]]);
    const [radioValue, setRadioValue] = useState("Update");
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    const toBotValueRef = useRef("")

    const dispatch = useDispatch()

    const handleDataCheckTreeSelected = useMemo(() => {
        return dataCheckTreeSelected.map(item => JSON.parse(item))
    }, [dataCheckTreeSelected])

    const addFilterRow = () => {
        setFilterDataRowList(filterRowList => [
            ...filterRowList,
            fieldFilterList[2]
        ])
    }

    const deleteFilterRow = (indexRow) => {
        setFilterDataRowList(filterRowList => filterRowList.filter((value, index) => index !== indexRow))
    }

    const handleChangeValue = (value, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return {
                    ...item,
                    data: {
                        ...item.data,
                        value: value
                    }
                }
            }
            return item
        }))
    }

    const handleFiledValueElement = (item, indexRow) => {
        switch (item.name) {
            case "Active":
                return <Checkbox
                    checked={item.data.value}
                    onChange={(e) => {
                        handleChangeValue(e.target.checked, indexRow)
                    }}
                />
            default:
                return <TextField
                    type='number'
                    value={item.data.value}
                    onChange={(e) => { handleChangeValue(e.target.value, indexRow) }}
                    size="small"
                    style={{
                        width: "100%"
                    }}
                >
                </TextField>
        }
    }

    const handleChangeField = (itemInput, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return itemInput
            }
            return item
        }))
    }

    const handleChangeCompare = (compareValue, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return {
                    ...item,
                    data: {
                        ...item.data,
                        compare: compareValue
                    }
                }
            }
            return item
        }))
    }

    const handleCompare = (valueDefault, compareValue, valueChange) => {
        if (typeof (valueChange) === "string") {
            valueChange = +valueChange
        }
        if (typeof (valueDefault) === "string") {
            valueDefault = +valueDefault
        }
        switch (compareValue) {
            case "=":
                return valueChange

            case "+":
                return valueDefault + valueChange

            case "-":
                return valueDefault - valueChange

            case "=%":
                return valueDefault * valueChange / 100

            case "+%":
                return valueDefault * (100 + valueChange) / 100
            case "-%":
                return valueDefault * (100 - valueChange) / 100

            default:
                return false

        }
    }

    const handleUpdate = async () => {
        setLoadingSubmit(true)
        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => (
                {
                    id: dataCheckTreeItem._id,
                    parentID: dataCheckTreeItem.parentID,
                    UpdatedFields: filterDataRowList.map(filterRow => {
                        let valueHandle = handleCompare(dataCheckTreeItem[filterRow.value], filterRow.data.compare, filterRow.data.value)
                        if (typeof (valueHandle) === "number") {
                            valueHandle = parseFloat(valueHandle.toFixed(4))
                        }
                        const { parentID, ...oldData } = dataCheckTreeItem
                        return {
                            ...oldData,
                            [filterRow.value]: valueHandle
                        }
                    }).reduce((accumulator, currentObject) => {
                        return { ...accumulator, ...currentObject };
                    }, {})

                }
            ))

            const res = await updateStrategiesMultiple(newData)

            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                dataChange = true
            }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update All Error",
            }))
        }
        closeDialog(dataChange)
    }

    const handleDelete = async () => {
        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => dataCheckTreeItem.parentID)

            const res = await deleteStrategiesMultiple([... new Set(newData)])

            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                dataChange = true
            }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete All Error",
            }))
        }
        closeDialog(dataChange)
    }

    const handleExport = () => {
        dispatch(addMessageToast({
            status: 1,
            message: "Export"
        }))
    }

    const handleCopy = () => {
        dispatch(addMessageToast({
            status: 1,
            message: "Copy"
        }))
    }

    const handleEdit = () => {
        switch (radioValue) {
            case "Update":
                handleUpdate()
                break
            case "Delete":
                handleDelete()
                break
            case "Export":
                handleExport()
                break
            case "Copy":
                handleCopy()
                break

        }
    }

    const handleChangeRatio = (e) => {
        setRadioValue(e.target.value)

    }

    const handleElementWhenChangeRatio = () => {
        switch (radioValue) {
            case "Update":
                return <Table

                    sx={{
                        ".css-1ex1afd-MuiTableCell-root, .css-1ygcj2i-MuiTableCell-root": {
                            border: "none",
                            padding: "10px",
                            fontSize: '1rem'
                        },
                    }}>
                    <TableHead >
                        <TableRow>
                            <TableCell style={{ width: "16px" }}>
                                <AddCircleOutlineIcon
                                    style={{
                                        cursor: "pointer"
                                    }}
                                    onClick={addFilterRow}
                                />
                            </TableCell>
                            <TableCell>Field</TableCell>
                            <TableCell>Compare</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>

                    </TableHead>

                    <TableBody>
                        {
                            filterDataRowList.map((filterRow, indexRow) => (
                                <TableRow
                                    key={`${filterRow.value}-${indexRow}`}
                                >
                                    <TableCell
                                    >
                                        <DeleteOutlineIcon
                                            style={{
                                                cursor: "pointer"
                                            }}
                                            onClick={() => { deleteFilterRow(indexRow) }}
                                        />
                                    </TableCell>
                                    <TableCell
                                    >
                                        <Select
                                            value={filterRow.value}
                                            size="small"
                                            style={{
                                                width: "100%"
                                            }}
                                        >
                                            {
                                                fieldFilterList.map((item) => (
                                                    <MenuItem
                                                        value={item.value}
                                                        key={item.value}
                                                        onClick={() => { handleChangeField(item, indexRow) }}
                                                    >{item.name}</MenuItem>
                                                ))
                                            }
                                        </Select>
                                    </TableCell>
                                    <TableCell >
                                        {
                                            <Select
                                                size="small"
                                                style={{
                                                    width: "100%"
                                                }}
                                                value={filterRow.data.compare}
                                            >
                                                {
                                                    filterRow.compareFilterList.map(item => (
                                                        <MenuItem
                                                            value={item}
                                                            key={item}
                                                            onClick={() => { handleChangeCompare(item, indexRow) }}

                                                        >{item}</MenuItem>
                                                    ))
                                                }
                                            </Select>
                                        }
                                    </TableCell>
                                    <TableCell >
                                        {
                                            handleFiledValueElement(filterRow, indexRow)
                                        }
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            case "Delete":
                return <></>
            case "Export":
                return <></>
            case "Copy":
                return <div style={{ display: "flex", alignItems: "center" }}>
                    <label style={{ marginRight: "24px", whiteSpace: "nowrap" }}>To bot</label>
                    <Select
                        size="small"
                        style={{
                            width: "100%"
                        }}
                        defaultValue={botList[0].value}
                        onChange={e => {
                            toBotValueRef.current = e.target.value
                        }}
                    >
                        {
                            botList.map(item => (
                                <MenuItem
                                    value={item.value}
                                    key={item}
                                >{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </div>
            default:
                return <></>

        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        setLoadingSubmit(false)
    }
    return (
        <DialogCustom
            open={true}
            onClose={() => { closeDialog(false) }}
            dialogTitle='Bulk'
            submitBtnText='Apply'
            maxWidth='sm'
            onSubmit={handleEdit}
            loading = {loadingSubmit}
            hideCloseBtn
        >
            <p style={{
                fontWeight: "600",
                marginBottom: "6px",
                fontSize: "1.1rem",
            }}>{dataCheckTreeSelected.length} items selected</p>
            <div style={{
                padding: "6px 12px",
                margin: "12px 0",
                border: "1px solid #d5d5d5"
            }}>
                <RadioGroup
                    defaultValue={radioValue}
                    onChange={handleChangeRatio}
                    style={{
                        display: "flex",
                        flexDirection: "row"
                    }}
                >
                    <FormControlLabel value="Update" control={<Radio />} label="Update" />
                    <FormControlLabel value="Delete" control={<Radio />} label="Delete" />
                    <FormControlLabel value="Export" control={<Radio />} label="Export" />
                    <FormControlLabel value="Copy" control={<Radio />} label="Copy" />
                </RadioGroup>
            </div>
            {
                handleElementWhenChangeRatio()
            }

        </DialogCustom>);
}

export default EditMulTreeItem;