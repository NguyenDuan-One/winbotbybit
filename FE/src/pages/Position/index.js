import { Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from '@mui/material/AppBar';

function PositionAll() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }

    return (
        <div style={{ marginBottom: "6px" }}>
            <AppBar position="static" style={{ background: `var(--tabColor)`, borderRadius: '30px' }}>
                <Tabs
                    centered
                    indicatorColor="secondary"
                    textColor="inherit"
                    variant="fullWidth"
                    sx={{
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'var(--tabBorder)', // Change the color of the indicator
                            width: '42vw !important', // Adjust the height of the indicator (or use width for vertical Tabs)
                            height: '3px',
                            marginLeft:'2vw !important',
                           
                        },
                    }}
                    value={location.pathname.split("/")[1]} onChange={handleChangeTab}>
                    <Tab sx={{
                        '&:hover': {
                            color: 'var(--tabBorder)',
                            opacity: 1,
                        },
                        '&.Mui-selected': {
                            color: 'var(--tabBorder)',
                        },
                        '&.Mui-focusVisible': {
                            backgroundColor: '#d1eaff',
                        },
                    }} label="V1" value="PositionV1"></Tab>
                    <Tab sx={{
                        '&:hover': {
                            color: 'var(--tabBorder)',
                            opacity: 1,
                        },
                        '&.Mui-selected': {
                            color: 'var(--tabBorder)',
                        },
                        '&.Mui-focusVisible': {
                            backgroundColor: '#d1eaff',
                        },
                    }} label="V3" value="PositionV3" ></Tab>
                </Tabs>
            </AppBar>

        </div>
    );
}

export default PositionAll;