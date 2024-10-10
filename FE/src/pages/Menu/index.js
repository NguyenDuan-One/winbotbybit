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
import { useNavigate } from "react-router-dom";
import { addMessageToast } from "../../store/slices/Toast";
import { removeLocalStorage } from "../../functions";
import { setUserDataLocal } from "../../store/slices/UserData";
import { verifyLogin } from "../../services/authService";
import SwitchUserModal from '../SwitchUser';
import MyProfile from '../MyProfile';
import { useDispatch, useSelector } from "react-redux";
import DnsIcon from '@mui/icons-material/Dns';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';
import avatar from "../../assets/avatar.jpg"
import avatarAdmin from "../../assets/admin.jpg"
import { Container } from '@mui/material';
import banner from '../../assets/img/banner.png';
import RepeatIcon from '@mui/icons-material/Repeat';
import HomeIcon from '@mui/icons-material/Home';
import LockResetIcon from '@mui/icons-material/LockReset';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
function Menu() {

    const [roleList, setRoleList] = useState([]);
    const [userData1, setUserData] = useState("");
    const [openSwitchUserModal, setOpenSwitchUserModal] = useState(false);
    const [openChangeModal, setOpenChangeModal] = useState(false);
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

    function onOpenChangePass() {
        setOpenChangeModal(true)
    }

    const handleSignOut = () => {
        removeLocalStorage()
        navigate("/login")
    }

    const linkList = [
        {
            linK: "/Users",
            name: "Người dùng",
            icon: <PersonIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400",
        },
        {
            linK: "/Groups",
            name: "Nhóm",
            icon: <GroupsIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/Bots",
            name: "Bots",
            icon: <DnsIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/BotTypes",
            name: "Loại BOT",
            icon: <PrecisionManufacturingIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/Spot",
            name: "Thiết lập lệnh",
            icon: <LocalMallIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/Strategies",
            name: "Thiết lập lệnh V3",
            icon: <MonetizationOnIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/Coin",
            name: "Danh sách coin",
            icon: <CurrencyExchangeIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/PositionV3",
            name: "Vị thế",
            icon: <ViewInArIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
        {
            linK: "/Order",
            name: "Order",
            icon: <ViewInArIcon className={styles.icon} />,
            color1: "indigo-500",
            color2: "indigo-400"
        },
    ]

    return (
        <div className='pb-20'>
            {/* <div className={styles.myProfileInfo}>
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
            </div> */}

            <div className="items-center flex-col w-full h-full p-[10px] bg-cover">
                {/* Background and profile */}
                <div
                    className="relative mt-1 flex h-32 w-full justify-center rounded-xl bg-cover"
                    style={{ backgroundImage: `url(${banner})` }}
                >
                    <div className="dark:!border-navy-700 absolute -bottom-12 flex h-[87px] w-[87px] items-center justify-center rounded-full border-[4px] border-white bg-pink-400">
                        <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} sx={{ width: 80, height: 80 }}
                        />
                    </div>
                </div>

                {/* Name and position */}
                <div className="mt-16 flex flex-col items-center">
                    <h4 className="text-navy-700 text-xl font-bold dark:text-white">
                        {userData?.userName || "User"}
                    </h4>
                    <h5 className="text-base font-normal text-gray-600">{userData?.roleName}</h5>
                </div>

                {/* Post followers */}
                <div className="mt-6 mb-3 flex gap-4 md:!gap-14 justify-center">
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            17
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Posts</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            9.7K
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Followers</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            434
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Following</p>
                    </div>
                </div>
            </div>
           <Container>
           <NavLink
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                to={"/"}
                key={"/"}
            >
                <HomeIcon className={styles.icon} />
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
                <RepeatIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Đổi tài khoản</p>
            </NavLink>

            <NavLink onClick={onOpenChangePass}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/changepassword"}
                to={"#"}
            >
                <LockResetIcon className={styles.icon} />
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
           </Container>

            {
                openSwitchUserModal && (
                    <SwitchUserModal
                        onClose={() => {
                            setOpenSwitchUserModal(false);
                        }}
                    />
                )


            }
            {
                openChangeModal && (
                    <MyProfile
                        onClose={() => {
                            setOpenChangeModal(false);
                        }}
                    />
                )
            }
        </div >
    );
}

export default Menu;