import FingerprintIcon from '@mui/icons-material/Fingerprint';
import logoImage from "../../../../assets/logo.png"
import avatar from "../../../../assets/avatar.jpg"
import avatarAdmin from "../../../../assets/admin.jpg"

import Avatar from '@mui/material/Avatar';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { Popover } from "@mui/material";
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styles from "./Heading.module.scss"
import { formatNumber, removeLocalStorage } from "../../../../functions";
import { useSelector } from "react-redux";
import SwitchUserModal from './components/SwitchUserModal';
import { Margin } from '@mui/icons-material';

function Heading({
    toggleSidebar,
    userData
}, ref) {

    const totalFuture = useSelector(state => state.totalFutureSlice.total)

    const location = useLocation()

    const [avatarDetailState, setAvatarDetailState] = useState(false);
    const [openSwitchUserModal, setOpenSwitchUserModal] = useState(false);

    const navigate = useNavigate()

    const handleSignOut = () => {
        removeLocalStorage()
        navigate("/login")
    }

    const handleMenu = () => {
        navigate("/menu")
    }

    const routeName = useMemo(() => {
        return location.pathname.split("/")[1]
    }, [location])


    return (
        <div className={styles.heading}>
            <NavLink className={styles.headingLogo} to="/">
                <img src={logoImage} />
                <span className={styles.text}>WinBot</span>
            </NavLink>
            {/* <DensityMediumIcon
                className={styles.navbar}
                onClick={toggleSidebar}
            /> */}
            {/* {
                routeName === "Strategies" &&
                <p className={styles.totalMoneyFutureBot}>{formatNumber(Number.parseFloat((+totalFuture || 0)))} $</p>
            } */}
            <div className={styles.headingInfor}>
                <div className={styles.avatar} onClick={(e) => {
                    handleMenu()
                }}>
                    <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} style={{ width: "40px" }} />
                    <div className="d-block ml-2">
                            <p className="text-md font-bold">{userData?.userName || "User"}</p>
                            <p className="text-xs ">{userData.roleName}</p>
                    </div>
                    {/* <div className={styles.name}>
                        <span>{userData?.userName || "User"}</span>
                        <ArrowDropDownIcon />
                       
                    </div> */}
                </div>
                {/* <Popover
                    open={avatarDetailState}
                    anchorEl={avatarDetailState}
                    onClose={() => {
                        setAvatarDetailState("")
                    }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}

                    style={{
                        marginTop: "20px"
                    }}
                    sx={{
                        ".MuiPopover-paper": {
                            boxShadow: "0 5px 25px 0 #60606033"
                        }
                    }}
                >
                    <div className={styles.avatarDetail}>

                        <div className={styles.name}>
                            <p className={styles.main}>{userData?.userName || "User"}</p>
                            <p className={styles.subMain}>{userData.roleName}</p>
                        </div>
                        <div className={styles.list}>
                            {(userData?.roleName !== "Trader" || localStorage.getItem("tk_crypto_temp")) && <div
                                className={styles.listItem}
                                style={{
                                    textAlign: "center",
                                }}
                                onClick={() => {
                                    setOpenSwitchUserModal(true)
                                }}>
                                <FingerprintIcon />
                                <p className={styles.listItemName} >Switch User</p>
                            </div>}
                            <NavLink
                                to="/MyProfile"
                                className={styles.listItem}
                                onClick={() => {
                                    setAvatarDetailState("")
                                }}
                            >
                                <PersonOutlineIcon />
                                <p className={styles.listItemName}>My Profile</p>
                            </NavLink>
                            <div className={styles.listItem} onClick={handleSignOut}>
                                <LogoutIcon />
                                <p className={styles.listItemName} >Sign Out</p>
                            </div>
                        </div>
                    </div>
                </Popover> */}
            </div>

            {
                openSwitchUserModal && (
                    <SwitchUserModal
                        onClose={() => {
                            setOpenSwitchUserModal(false);
                        }}
                    />
                )
            }

        </div>
    );
}

export default Heading;