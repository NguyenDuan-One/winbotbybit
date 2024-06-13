import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, MenuItem, Select, Switch } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import { useState, memo, useEffect, useRef, useMemo } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import AddBot from "./components/AddBot";
import { deleteMultipleBot, getAllBot, getAllBotBySameGroup, getAllBotByUserID, updateBot } from "../../services/botService";
import styles from "./Bot.module.scss"
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';

const botTypeList = [
    {
        name: "All",
        value: "All"
    },
    {
        name: "BybitV3",
        value: "BybitV3"
    }
]

const statusList = [
    {
        name: "All",
        value: "All"
    },
    {
        name: "Pending",
        value: "Pending"
    },
    {
        name: "PendingApproval",
        value: "PendingApproval"
    },
    {
        name: "Installing",
        value: "Installing"
    },
    {
        name: "Stopped",
        value: "Stopped"
    },
    {
        name: "Running",
        value: "Running"
    }
]


function Bot() {

    const userData = JSON.parse(localStorage.getItem("user"))

    const roleName = useMemo(() => {
        return userData?.roleName
    }, [])

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'activeBot',
            type: "actions",
            maxWidth: 120,
            headerName: 'Active',
            renderCell: params => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                const botStatus = rowData['Status']
                return (
                    <Switch
                        disabled={!(botStatus === "Running" || botStatus === "Stopped")}
                        defaultChecked={botStatus === "Running"}
                        onClick={(e) => {
                            handleUpdateBot({
                                botID: rowData.id,
                                data: {
                                    Status: e.target.checked ? "Running" : "Stopped",
                                }
                            })
                        }}
                    />
                )

            },

        },

        {
            field: 'botName',
            headerName: 'Name',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: e => {
                return (
                    <Link to={`Detail/${e.id}`} style={{
                        color: "var(--blueLightColor)",
                        textDecoration: "none"
                    }
                    } > {e.value}
                    </Link >
                )

            },

        },
        {
            field: 'Balance',
            headerName: 'Balance',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'botType',
            headerName: 'Type',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },

        // { field: 'id', headerName: 'Id', minWidth: 200,
        //  },
        // { field: 'Server', headerName: 'Server',
        //  },
        // { field: 'Version', headerName: 'Version',
        //  },
        {
            field: 'userName',
            headerName: 'User Created',
            minWidth: 170,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Created',
            headerName: 'Created',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Status',
            headerName: 'Status',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },

    ]

    roleName !== "Trader" && tableColumns.push({
        field: 'Approval',
        headerName: 'Approval',
        type: "actions",
        minWidth: 150,
        flex: window.innerWidth <= 740 ? undefined : 1,
        renderCell: params => {
            const rowData = params.row;
            const botStatus = rowData['Status']
            return (
                <Button
                    size='small'
                    color='warning'
                    variant='contained'
                    onClick={() => {
                        handleUpdateBot({
                            botID: rowData.id,
                            data: {
                                Status: "Stopped"
                            }
                        })
                    }}
                    style={{
                        display: botStatus === "PendingApproval" ? "unset" : "none"
                    }}
                >
                    Approval
                </Button >
            )

        },
    })

    const [botTypeChoose, setBotTypeChoose] = useState(botTypeList[0].value);
    // const [statusChoose, setStatusChoose] = useState(statusList[0].value);
    const [botList, setBotList] = useState([]);
    const [openAddBot, setOpenAddBot] = useState({
        isOpen: false,
        dataChange: "",
    });
    const [dataTableChange, setDataTableChange] = useState([]);
    const [openEditMultiple, setOpenEditMultiple] = useState(false);
    const [statusBotSelected, setStatusBotSelected] = useState('All');

    const botListDefaultRef = useRef()

    const dispatch = useDispatch()

    const handleChangeBotType = (e) => {
        setBotTypeChoose(e.target.value)
    }

    const handleChangeStatus = (value) => {
        setStatusBotSelected(value)
        if (value !== "All") {
            setBotList(botListDefaultRef.current.filter(bot => bot.Status === value))
        }
        else {
            setBotList(botListDefaultRef.current)
        }
    }

    const handleUpdateBot = async ({ botID, data }) => {
        try {
            const res = await updateBot({
                id: botID,
                data
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                const newData = botList.map(bot => {
                    if (botID === bot._id) {
                        return {
                            ...bot,
                            ...data,

                        }
                    }
                    return bot
                })
                setBotList(newData)
                botListDefaultRef.current = newData
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Bot Error",
            }))
        }
    }

    const handleGetAllBot = async () => {
        try {
            let res
            if (roleName === "Trader") {
                res = await getAllBotByUserID(userData._id)
            }
            else if (roleName === "ManagerTrader") {
                res = await getAllBotBySameGroup(userData.groupID)
            }
            else {
                res = await getAllBot()
            }
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        id: item?._id,
                        Created: item?.Created && new Date(item?.Created).toLocaleDateString(),
                        userName: item.userID?.userName
                    }
                ))
                botListDefaultRef.current = newData
                setBotList(newData)
            }
            else {
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Bot Error",
            }))
        }
    }

    const handleDeleteRowSelected = async () => {

        try {
            const res = await deleteMultipleBot(dataTableChange)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            handleGetAllBot()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Bot Error",
            }))
        }
        setOpenEditMultiple(false)
    }

    useEffect(() => {
        handleGetAllBot()
    }, []);

    useEffect(() => {
        const newData = openAddBot.dataChange
        if (newData) {
            handleGetAllBot()
            setStatusBotSelected("All")
            setOpenAddBot({
                dataChange: "",
                isOpen: false
            })
        }
    }, [openAddBot]);

    return (
        <div className={styles.bot}>
            <AddBreadcrumbs list={["Bots"]} />
            <div className={styles.botFilterList}>
                <div className={styles.botFilterListItem}>
                    <p className={styles.label}>BotType</p>
                    <Select
                        size="small"
                        className={styles.select}
                        value={botTypeChoose}
                        onChange={handleChangeBotType}
                    >
                        {
                            botTypeList.map(item => (

                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </div>
                <div className={styles.botFilterListItem}>
                    <p className={styles.label}>Status</p>
                    <Select
                        size="small"
                        className={styles.select}
                        value={statusBotSelected}
                        onChange={e => { handleChangeStatus(e.target.value) }}
                    >
                        {
                            statusList.map(item => (

                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </div>
            </div>
            <div className={styles.botTableContainer}>
                <div className={styles.botTableContainerTitle}>
                    <b style={{ fontWeight: "bold" }}>Total: 0$</b>
                    <div>
                        {dataTableChange.length > 0 && (
                            <Button
                                size="small"
                                variant="contained"
                                color="error"
                                startIcon={<DeleteOutlineIcon />}
                                style={{ marginRight: "12px" }}
                                onClick={() => {
                                    setOpenEditMultiple(dataTableChange.length)
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setOpenAddBot(openAddBot => ({ ...openAddBot, isOpen: true }))
                            }}
                        >
                            Bot
                        </Button>
                    </div>
                </div>
                <div className={styles.botTableContainerData}>
                    <DataGridCustom
                        setDataTableChange={setDataTableChange}
                        tableRows={botList}
                        tableColumns={tableColumns}
                    />
                </div>
            </div>
            {openAddBot.isOpen && <AddBot
                open={true}
                onClose={(data) => {
                    setOpenAddBot(data)
                }}
            />}

            {
                openEditMultiple && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenEditMultiple(false)
                        }}
                        onSubmit={handleDeleteRowSelected}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to delete {openEditMultiple} bots?</p>
                    </DialogCustom >
                )
            }
        </div >

    );
}

export default memo(Bot);