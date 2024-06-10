import logoImage from "../../../../assets/logo.png"
import avatar from "../../../../assets/avatar.jpg"
import avatarAdmin from "../../../../assets/admin.jpg"
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Avatar from '@mui/material/Avatar';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { Popover } from "@mui/material";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./Heading.module.scss"

function Heading({
    toggleSidebar,
    userData
}, ref) {

    const [avatarDetailState, setAvatarDetailState] = useState(false);

    const navigate = useNavigate()
    const handleSignOut = () => {
        localStorage.removeItem("token");
        navigate("/login")
    }

    return (
        <div className={styles.heading}>
            <NavLink className={styles.headingLogo} to="/">
                <img src={logoImage} />
                <span className={styles.text}>CryptoBot</span>
            </NavLink>
            <DensityMediumIcon
                className={styles.navbar}
                onClick={toggleSidebar}
            />
            <div className={styles.headingInfor} >
                <div className={styles.avatar} onClick={(e) => {
                    setAvatarDetailState(e.currentTarget)
                }}>
                    <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} />
                    <div className={styles.name}>
                        <span>{userData?.userName || "User"}</span>
                        <ArrowDropDownIcon />
                    </div>
                </div>
                <Popover
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
                </Popover>
            </div>

        </div>
    );
}

export default Heading;