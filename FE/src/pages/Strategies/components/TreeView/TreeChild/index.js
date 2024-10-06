import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import styles from "./TreeChild.module.scss"
import { deleteStrategiesItem, updateStrategiesByID } from '../../../../../services/dataCoinByBitService';
import { addMessageToast } from '../../../../../store/slices/Toast';
import { useDispatch } from 'react-redux';
import DialogCustom from '../../../../../components/DialogCustom';
import IOSSwitch from '../../../../../components/SwitchCustomer';
import { memo, useCallback, useState } from 'react';
import { TableRow, TableCell, Switch } from '@mui/material';
import UpdateStrategy from '../../UpdateStrategy';
import clsx from 'clsx';
import { formatNumberString, handleCheckAllCheckBox } from '../../../../../functions';
import FormControlLabel from '@mui/material/FormControlLabel';
function TreeChild({
    treeData,
    treeNode,
    dataCheckTreeSelectedRef,
    setDataCheckTree,
    dataCheckTreeDefaultRef,
}) {

    const [openDeleteTreeItem, setOpenDeleteTreeItem] = useState({
        isOpen: false,
        data: {
            id: "",
            parentID: "",
        }
    });
    const [openUpdateStrategy, setOpenUpdateStrategy] = useState(
        {
            isOpen: false,
            dataChange: false,
            data: ""
        }
    );


    const dispatch = useDispatch();

    const closeDeleteDialog = () => {
        setOpenDeleteTreeItem({
            isOpen: false,
            data: {
                id: "",
                parentID: "",
            }
        })
    }


    const handleUpdateDataAfterSuccess = useCallback((newData) => {

        handleCheckAllCheckBox(false)

        setDataCheckTree(dataCheckTree => dataCheckTree.map(data => {
            if (data._id === treeData._id) {
                return {
                    ...treeData,
                    children: treeData.children.map(treeItem => {
                        if (treeItem.value === treeNode.value) {
                            return newData
                        }
                        return treeItem
                    })
                }
            }
            return data
        }))
        dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(data => {
            if (data._id === treeData._id) {
                return {
                    ...treeData,
                    children: treeData.children.map(treeItem => {
                        if (treeItem.value === treeNode.value) {
                            return newData
                        }
                        return treeItem
                    })
                }
            }
            return data
        })

    }, [treeData, treeNode, dataCheckTreeSelectedRef])

    const handleDeleteStrategiesItem = async ({ id, parentID }) => {
        try {
            const res = await deleteStrategiesItem({
                id: id,
                parentID,
            })
            const { status, message } = res.data

            if (status === 200) {
                setDataCheckTree(dataCheckTree => dataCheckTree.map(data => {
                    if (data._id === treeData._id) {
                        return {
                            ...treeData,
                            children: treeData.children.filter(treeItem => treeItem.value !== treeNode.value)
                        }
                    }
                    return data
                }))

                dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(data => {
                    if (data._id === treeData._id) {
                        return {
                            ...treeData,
                            children: treeData.children.filter(treeItem => treeItem.value !== treeNode.value)
                        }
                    }
                    return data
                })
            }

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Error",
            }))
        }
        closeDeleteDialog()
    }

    const handleActiveStrategy = async ({
        id,
        parentID,
        newData,
        symbol
    }) => {
        try {
            const res = await updateStrategiesByID({
                id: id,
                data: {
                    parentID,
                    newData,
                    symbol,
                }
            })
            const { status, message } = res.data

            if (status === 200) {
                handleUpdateDataAfterSuccess(newData)
            }

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Active Error",
            }))
        }
    }

    return (
        <>
            <TableRow className={styles.treeChild} key={treeNode.value} >
                <TableCell
                    style={{
                        lineHeight: "100%"
                    }}
                >
                    <input
                        type='checkbox'
                        className={clsx("nodeItemSelected", `nodeItemSelected-${treeData._id}`, styles.checkboxStyle)}
                        onClick={(e) => {
                            const check = e.target.checked;
                            if (check) {
                                dataCheckTreeSelectedRef.current.push(JSON.stringify({
                                    ...treeNode,
                                    parentID: treeData._id
                                }))
                            }
                            else {
                                const newDataCheckTreeSelected = [];
                                const targetString = JSON.stringify({ ...treeNode, parentID: treeData._id });

                                // for (let i = 0; i < dataCheckTreeSelectedRef.current.length; i++) {
                                //     const currentItem = dataCheckTreeSelectedRef.current[i];
                                //     if (currentItem !== targetString) {
                                //         newDataCheckTreeSelected.push(currentItem);
                                //     }
                                // }

                                // dataCheckTreeSelectedRef.current = newDataCheckTreeSelected;
                                dataCheckTreeSelectedRef.current = dataCheckTreeSelectedRef.current.filter(currentItem => currentItem !== targetString);

                            }
                        }}
                    />
                </TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                >
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#3277d5",
                        
                    }}>

                        <FormControlLabel className='!mr-2'
                            control={<IOSSwitch sx={{ m: 0 }} checked={treeNode.IsActive}
                                onChange={(e) => {
                                    handleActiveStrategy({
                                        id: treeNode._id,
                                        parentID: treeData._id,
                                        symbol: treeData.value,
                                        newData: { ...treeNode, IsActive: e.target.checked }
                                    })
                                }} />}
                        //label="iOS style"
                        />
                        <button className='btn px-1 rounded-lg' style={{background:`var(--btnSubmitColor)`}}>
                            <EditIcon
                                className="text-white"
                                onClick={e => {
                                    e.preventDefault()
                                    setOpenUpdateStrategy({
                                        ...openUpdateStrategy,
                                        isOpen: true,
                                        data: {
                                            treeNode: {
                                                ...treeNode,
                                                parentID: treeData._id,
                                            },
                                            symbolValue: treeData.value
                                        }
                                    })
                                }}
                                style={{
                                    marginLeft: "3px"
                                }}
                            />
                        </button>
                        {
                            !treeNode.IsActive && (
                                <button className='btn px-2 ml-2 rounded-lg' style={{background: `var(--btnSubmitColor)`}}>
                                    <DeleteOutlineIcon
                                        className="text-white"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setOpenDeleteTreeItem({
                                                isOpen: true,
                                                data: {
                                                    id: treeNode._id,
                                                    parentID: treeData._id
                                                }
                                            })
                                        }}

                                    />
                                </button>

                            )
                        }

                    </div>
                </TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                    style={{
                        minWidth: "50px",
                        whiteSpace: "nowrap",
                    }}>
                    {treeNode?.botID?.botName}
                </TableCell>
                <TableCell className={styles.tableBodyCell} style={{
                    color: treeNode.PositionSide === "Long" ? "green" : "red"
                }}>{treeNode.PositionSide}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Amount}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.OrderChange}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Candlestick}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.TakeProfit}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.ReduceTakeProfit}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.ExtendedOCPercent}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Ignore}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.EntryTrailing || 40}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.StopLose}</TableCell>
                <TableCell className={styles.tableBodyCell}>{formatNumberString(treeNode.volume24h)}</TableCell>
            </TableRow >
            {
                openDeleteTreeItem.isOpen &&

                <DialogCustom
                    dialogTitle='Cảnh báo'
                    reserveBtn
                    open={openDeleteTreeItem.isOpen}
                    onClose={closeDeleteDialog}
                    submitBtnText='Confirm'
                    position='center'
                    submitBtnColor='error'
                    backdrop
                    onSubmit={() => {
                        handleDeleteStrategiesItem({
                            id: openDeleteTreeItem.data.id,
                            parentID: openDeleteTreeItem.data.parentID
                        })
                    }}
                >
                    <p>Bạn có chắc chắn muốn xóa?</p>
                </DialogCustom>
            }

            {
                openUpdateStrategy.isOpen &&

                <UpdateStrategy
                    onClose={(data) => {
                        setOpenUpdateStrategy(data)
                    }}
                    treeNodeValue={openUpdateStrategy.data.treeNode}
                    symbolValue={openUpdateStrategy.data.symbolValue}
                    handleUpdateDataAfterSuccess={handleUpdateDataAfterSuccess}
                />

            }
             
        </>
    );
}

export default memo(TreeChild);