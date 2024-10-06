import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, MenuItem, Select, Switch } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useState, memo, useEffect, useMemo, useRef } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import styles from "./Bot.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
import AddGroup from './components/AddGroup';
import { deleteMultipleGroup, getAllGroup, getGroupByID } from '../../services/groupService';
import { deleteUser, getAllUserByGroupID, updateUser } from '../../services/userService';
import clsx from 'clsx';
import EditUser from './components/EditUser';
import IOSSwitch from '../../components/SwitchCustomer';

function Group() {

    const userData = useSelector(state => state.userDataSlice.userData)

    const checkAdminTrue = useMemo(() => {
        return userData?.roleName === "Admin" || userData?.roleName === "SuperAdmin"
    }, [userData.roleName])

    const checkRoleEditable = (userRole) => {
        const roleOfMe = userData?.roleName
        if (roleOfMe === "SuperAdmin") {
            return ["Admin", "ManagerTrader", "Trader"].includes(userRole)
        }
        else if (roleOfMe === "Admin") {
            return ["ManagerTrader", "Trader"].includes(userRole)
        }
        return false
    }

    // const [statusChoose, setStatusChoose] = useState(statusList[0].value);
    const [groupList, setGroupList] = useState([]);
    const [openAddBot, setOpenAddBot] = useState({
        isOpen: false,
        dataChange: "",
    });
    const [openEditBot, setOpenEditBot] = useState({
        isOpen: false,
        dataInput: "",
        dataChange: "",
    });
    const [dataTableChange, setDataTableChange] = useState([]);
    const [openEditMultiple, setOpenEditMultiple] = useState(false);
    const [openDeleteUser, setOpenDeleteUser] = useState(false);
    const [groupSelected, setGroupSelected] = useState("");
    const [userList, setUserList] = useState([]);

    const dispatch = useDispatch()

    const tableColumns = [
        // {
        //     field: 'stt',
        //     headerName: '#',
        //     maxWidth: 50,
        //     type: "actions",
        //     renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        // },
        {
            field: 'isActive',
            headerName: 'Active',
            maxWidth: 120,
            minWidth: 10,
            type: "actions",
            renderCell: (params) => {
                const rowData = params.row;
                const userName = rowData["userName"]
                const roleName = rowData["roleName"]
                const userID = rowData._id
                return <IOSSwitch
                    disabled={!checkRoleEditable(roleName)}
                    defaultChecked={params.value}
                    onClick={e => {
                        handleUpdateUser({
                            userID,
                            newData: {
                                userName,
                                roleName,
                                isActive: e.target.checked
                            }
                        })
                    }}
                />
            }
        },
        {
            field: 'Action',
            headerName: 'Action',
            maxWidth: 150,
            minWidth: 20,
            type: "actions",
            renderCell: (params) => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                const isActive = rowData["isActive"]
                const checkRole = checkRoleEditable(rowData["roleName"])
                return (

                    <div>
                        <button className={clsx('bg-blue-600 px-2 py-1 rounded-lg', !checkRole && '!bg-gray-500 px-2 py-1 rounded-lg')}>
                            <EditIcon
                                // className={clsx(styles.icon, !checkRole && styles.iconDisabled)}
                                style={{
                                    color: "#fff"
                                }}
                                onClick={e => {
                                    e.stopPropagation()
                                    checkRole && setOpenEditBot({
                                        dataChange: "",
                                        isOpen: true,
                                        dataInput: rowData
                                    })
                                }}
                            />
                        </button>
                        {!isActive && <button className={clsx('bg-blue-600 px-2 py-1 rounded-lg', !checkRole && '!bg-gray-500 px-2 py-1 rounded-lg')}>
                            <DeleteOutlineIcon
                                style={{
                                    marginLeft: "5px",
                                    color: "#fff"
                                }}
                                onClick={e => {
                                    checkRole && setOpenDeleteUser({
                                        userID: rowData.id,
                                        groupID: rowData.groupID?._id,
                                    })
                                }}
                            />
                        </button>}
                    </div>
                )

            },

        },
        {
            field: 'userName',
            headerName: 'Name',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1
        },
        {
            field: 'roleName',
            headerName: 'Role',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1
        },
        {
            field: 'groupName',
            headerName: 'Group',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1
        },
        // {
        //     field: 'isActive',
        //     headerName: 'Active',
        //     maxWidth: 150,
        //     minWidth: 120,
        //     type: "actions",
        //     renderCell: (params) => {
        //         const rowData = params.row;
        //         const userName = rowData["userName"]
        //         const roleName = rowData["roleName"]
        //         const userID = rowData._id
        //         return <IOSSwitch
        //             disabled={!checkRoleEditable(roleName)}
        //             defaultChecked={params.value}
        //             onClick={e => {
        //                 handleUpdateUser({
        //                     userID,
        //                     newData: {
        //                         userName,
        //                         roleName,
        //                         isActive: e.target.checked
        //                     }
        //                 })
        //             }}
        //         />
        //     }
        // }
    ]

    const disabledListRow = useMemo(() => {
        if (userList?.length > 0) {
            return userList.reduce((pre, cur) => {
                if (!checkRoleEditable(cur.roleName)) {
                    return pre.concat(cur.id)
                }
                return pre
            }, [])
        }
        return []
    }, [userList])

    const handleGetUserByGroup = async (groupSelectedInput) => {
        try {

            const res = await getAllUserByGroupID(groupSelectedInput ? groupSelectedInput : groupSelected)
            const { status, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        groupName: item?.groupID?.name,
                        id: item._id,
                    }
                ))
                setUserList(newData)
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All User Error",
            }))
        }
    }

    const handleGetAllGroup = async () => {
        try {
            let res
            let checkUserGroup = true
            if (checkAdminTrue) {
                res = await getAllGroup()
            }
            else {
                const groupIDUser = userData?.groupID
                if (groupIDUser) {
                    res = await getGroupByID(userData?.groupID)
                }
                else {
                    checkUserGroup = false
                }
            }

            if (checkUserGroup) {
                const { status, data: resData } = res.data

                const newResData = checkAdminTrue ? resData : [resData]
                if (status === 200) {
                    const newData = newResData?.map(item => (
                        {
                            name: item.name,
                            value: item._id,
                        }
                    ))
                    if (checkAdminTrue) {
                        newData.unshift({
                            name: "All",
                            value: "All",
                        })
                    }
                    setGroupSelected(newData[0].value)
                    setGroupList(newData)
                    handleGetUserByGroup(newData[0].value)
                }
            }
            else {
                setUserList([
                    {
                        ...userData,
                        id: userData._id
                    }
                ])
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Group Error",
            }))
        }
    }

    const handleUpdateUser = async ({ userID, newData }) => {
        try {

            const res = await updateUser({ userID, newData })
            const { status, message, data: resData } = res.data
            if (status === 200) {
                setUserList(userList => userList.map(user => {
                    if (user.id === userID) {
                        return {
                            ...user,
                            ...newData
                        }
                    }
                    return user
                }))
            }
            dispatch(addMessageToast({
                status,
                message
            }))
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All User Error",
            }))
        }
    }

    const handleDeleteRowSelected = async () => {

        try {
            const res = await deleteMultipleGroup(dataTableChange)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            handleGetUserByGroup()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete User Error",
            }))
        }
        setOpenEditMultiple(false)
    }

    const handleDeleteUser = async () => {

        try {
            const res = await deleteUser(openDeleteUser)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            handleGetUserByGroup()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete User Error",
            }))
        }
        setOpenDeleteUser(false)
    }



    const handleChangeGroup = (e) => {
        const value = e.target.value
        setGroupSelected(value)
        handleGetUserByGroup(value)
    }

    useEffect(() => {
        userData.userName && handleGetAllGroup()
    }, [userData.userName]);

    useEffect(() => {
        const newData = openAddBot.dataChange || openEditBot.dataChange
        newData && handleGetUserByGroup()
    }, [openAddBot, openEditBot]);

    return (
        <div className={styles.bot}>
            <AddBreadcrumbs list={["User"]} />
            <div className={styles.botTableContainer}>
                <div className={styles.botTableContainerTitle}>
                    <div className={styles.filterList}>
                        <div className={styles.filterListItem}>
                            <p className={styles.label}>Nhóm</p>
                            <Select
                                size="small"
                                className={styles.select}
                                value={groupSelected}
                                onChange={handleChangeGroup}
                            >
                                {
                                    groupList.map(item => (

                                        <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </div>

                    </div>
                    {
                        checkAdminTrue && (
                            <div>
                                {dataTableChange.length > 0 && (
                                    <Button
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
                                <button className='bg-blue-600 px-3 py-2 rounded-lg' onClick={() => {
                                    setOpenAddBot(openAddBot => ({ ...openAddBot, isOpen: true }))
                                }}>
                                    <AddIcon className='text-white font-bold' />
                                </button>
                            </div>
                        )
                    }
                </div>
                <div className={styles.botTableContainerData}>
                    <DataGridCustom
                        setDataTableChange={setDataTableChange}
                        tableRows={userList}
                        tableColumns={tableColumns}
                        disabledListRow={disabledListRow}
                        checkboxSelection={false}
                    />
                </div>
            </div>


            {
                openAddBot.isOpen && <AddGroup
                    onClose={(data) => {
                        setOpenAddBot(data)
                    }}
                    groupSelected={groupSelected}
                />
            }
            {
                openEditBot.isOpen && (
                    <EditUser
                        onClose={(data) => {
                            setOpenEditBot(data)
                        }}
                        dataInput={openEditBot.dataInput}
                    />
                )
            }

            {
                openDeleteUser && (
                    <DialogCustom
                        backdrop
                        open={openDeleteUser}
                        onClose={() => {
                            setOpenDeleteUser(false)
                        }}
                        onSubmit={handleDeleteUser}
                        dialogTitle="Cảnh báo"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to delete this user?</p>
                    </DialogCustom >
                )
            }

            {
                openEditMultiple && (
                    <DialogCustom
                        backdrop
                        open={openEditMultiple}
                        onClose={() => {
                            setOpenEditMultiple(false)
                        }}
                        onSubmit={handleDeleteRowSelected}
                        dialogTitle="Cảnh báo"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center">
                        <p style={{ textAlign: "center" }}>Do you want to delete {openEditMultiple} groups?</p>
                    </DialogCustom >
                )
            }
        </div >

    );
}

export default memo(Group);