import PersonIcon from '@mui/icons-material/Person';
import GridViewIcon from '@mui/icons-material/GridView';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsIcon from '@mui/icons-material/Groups';
import { NavLink } from "react-router-dom"
import clsx from "clsx";
import styles from "./Menu.module.scss"
import { useState, useEffect } from 'react';
import { getByRoleName } from "../../services/roleService";
import { getUserByID } from "../../services/userService";
import {  useNavigate } from "react-router-dom";
import { addMessageToast } from "../../store/slices/Toast";
import { removeLocalStorage } from "../../functions";
import { setUserDataLocal } from "../../store/slices/UserData";
import { verifyLogin } from "../../services/authService";
import SwitchUserModal from '../SwitchUser';
import { useDispatch, useSelector } from "react-redux";
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';
import avatar from "../../assets/avatar.jpg"
import avatarAdmin from "../../assets/admin.jpg"
import { Container } from '@mui/material';
function Menu() {
    
    const [roleList, setRoleList] = useState([]);
     const [userData1, setUserData] = useState("");
    const [openSwitchUserModal, setOpenSwitchUserModal] = useState(false);
    const userData = useSelector(state => state.userDataSlice.userData)
    const handleVerifyLogin = async () => {
        try {
            const res = await verifyLogin()
            const userData = res.data.data
            getRoleList(userData._id)
        } catch (error) {
            removeLocalStorage()
            navigate("/login")
        }
    }

    const navigate = useNavigate()
    const dispatch = useDispatch()
    const getRoleList = async (userID) => {
        try {

            const resUser = await getUserByID(userID)

            const { data: resUserData } = resUser.data
            if (resUserData) {

                dispatch(setUserDataLocal(resUserData))
                setUserData(resUserData)

                const res = await getByRoleName(resUserData?.roleName || "")
                console.log(res.data)
                const { data: resData } = res.data

                setRoleList(resData.roleList || [])
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Role User Error",
            }))
            removeLocalStorage()
            navigate("/login")
        }
    }

    useEffect(() => {
        handleVerifyLogin()
    }, []);

    function onOpenSwitchUser() {
        setOpenSwitchUserModal(true)
    }

    const handleSignOut = () => {
        removeLocalStorage()
        navigate("/login")
    }

    const linkList = [

        {
            linK: "/Users",
            name: "Người dùng",
            icon: <PersonIcon className={styles.icon} />
        },
        {
            linK: "/Groups",
            name: "Nhóm",
            icon: <GroupsIcon className={styles.icon} />
        },
        {
            linK: "/Bots",
            name: "VPS",
            icon: <SmartToyIcon className={styles.icon} />
        },
        {
            linK: "/BotTypes",
            name: "Loại BOT",
            icon: <PrecisionManufacturingIcon className={styles.icon} />
        },
        {
            linK: "/Spot",
            name: "Thiết lập lệnh",
            icon: <LocalMallIcon className={styles.icon} />
        },
        {
            linK: "/Strategies",
            name: "Thiết lập lệnh V3",
            icon: <LocalMallIcon className={styles.icon} />
        },
        {
            linK: "/Coin",
            name: "Danh sách coin",
            icon: <CurrencyExchangeIcon className={styles.icon} />
        },
        {
            linK: "/PositionV3",
            name: "Vị thế",
            icon: <ViewInArIcon className={styles.icon} />
        },
        // {
        //     linK: "/Order",
        //     name: "Order",
        //     icon: <ViewInArIcon className={styles.icon} />
        // },
    ]

    return (
        <Container className='pb-20'>
            <div className={styles.myProfileInfo}>
                <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} sx={{ width: 160, height: 160 }}
                />
                <p style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    margin: "16px 0 0"
                }}>{userData?.userName || "User"}</p>

                <p style={{
                    fontSize: "1.1rem",
                    fontWeight: 400,
                    opacity: ".8",
                    marginTop: "6px"
                }}>{userData?.roleName}</p>
            </div>

            <NavLink
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                to={"/"}
                key={"/"}
            >
                <GridViewIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Trang chủ</p>
            </NavLink>
            {
                linkList.map(item => (
                    <div key={item.linK}>
                        {
                            
                            roleList.includes(item.linK.replace("/", "")) && <NavLink
                                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                                to={item.linK}>
                                {item.icon}
                                <p className={styles.sidebarItemName}>{item.name}</p>
                            </NavLink>
                        }
                    </div>
                ))
            }

            <NavLink onClick={onOpenSwitchUser}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/switchuser"}
                to={"#"}
            >
                <FingerprintIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Đổi tài khoản</p>
            </NavLink>

            <NavLink onClick={onOpenSwitchUser}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/changepassword"}
                to={"#"}
            >
                <FingerprintIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Thay đổi mật khẩu</p>
            </NavLink>

            <NavLink onClick={handleSignOut}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/logout"}
                to={"/login"}
            >
                <LogoutIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Đăng xuất</p>
            </NavLink>

            {
                openSwitchUserModal && (
                    <SwitchUserModal
                        onClose={() => {
                            setOpenSwitchUserModal(false);
                        }}
                    />
                )
            }

        </Container >
    );
}

export default Menu;