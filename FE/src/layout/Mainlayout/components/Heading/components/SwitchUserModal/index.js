import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DialogCustom from "../../../../../../components/DialogCustom";
import { useEffect, useState } from "react";
import DataGridCustom from "../../../../../../components/DataGridCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllUserByRoleName } from "../../../../../../services/userService";
import { Button } from "@mui/material";
import { loginSwitch } from '../../../../../../services/authService';
import { useNavigate } from 'react-router-dom';

function SwitchUserModal({
    onClose
}) {

    const userData = JSON.parse(localStorage.getItem("user"))

    const roleName = userData?.roleName

    const tableColumns = [

        {
            field: 'Action',
            headerName: 'Switch',
            maxWidth: 150,
            minWidth: 120,
            type: "actions",
            renderCell: (params) => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                const userID = rowData["id"]
                const userName = rowData["userName"]

                return (
                    <span
                        style={{
                            color: "var(--blueLightColor)",
                            cursor: "pointer"
                        }}
                        onClick={() => {
                            handleSwitchUser({
                                userID,
                                userName
                            })
                        }}
                    >
                        <FingerprintIcon style={{ fontSize: "1.7rem" }} />
                    </span>
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

    ]
    const [userList, setUserList] = useState([]);
    const dispatch = useDispatch()
    const navigate = useNavigate()


    const handleGetAllUserByRoleName = async () => {
        try {

            const res = await getAllUserByRoleName(roleName)
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
            console.log(error);
            dispatch(addMessageToast({
                status: 500,
                message: "Get All User Switch Error",
            }))
        }
    }

    const handleSwitchUser = async ({
        userID,
        userName
    }) => {
        try {
            const res = await loginSwitch({
                userID,
                userName
            });
            const { message, data: resData, status } = res.data
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))

            if (status === 200) {
                localStorage.setItem('tk_crypto_temp', resData.token)
                localStorage.setItem('user', JSON.stringify(resData.user))
                navigate(0)
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: error.message
            }));
        }
    }


    useEffect(() => {
        handleGetAllUserByRoleName()
    }, []);
    return (
        <DialogCustom
            open={true}
            backdrop
            dialogTitle='Switch User'
            onClose={onClose}
            submitBtnText='Switch'
            onSubmit={handleSwitchUser}
            hideActionBtn
            maxWidth="sm"
        >
            <Button
                variant='contained'
                style={{
                    margin: '6px auto 16px',
                    width: "fit-content",
                }}
                onClick={() => {
                    localStorage.removeItem("tk_crypto_temp")
                    navigate(0)
                }}
            >
                Back To Main Account
            </Button>
            <DataGridCustom
                tableRows={userList}
                tableColumns={tableColumns}
                checkboxSelection={false}
            />
        </DialogCustom>
    );
}

export default SwitchUserModal;