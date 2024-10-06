import styles from "./BotDetail.module.scss"
import { Tab, Tabs } from "@mui/material";
import { useState } from "react";
import Overview from "./components/Overview";
import Wallet from "./components/Wallet";
import Api from "./components/Api";
import Setting from "./components/Setting";
import AddBreadcrumbs from "../../../../components/BreadcrumbsCutom";
import AppBar from '@mui/material/AppBar';

function BotDetail() {


    const [tabNumber, setTabNumber] = useState("Overview");

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Overview":
                return (
                    <Overview />
                )

            case "Wallet":
                return <Wallet />
            case "Api":
                return <Api />
            case "Setting":
                return <Setting />
        }
    }


    return (
        <div className={styles.botDetail}>
            <AddBreadcrumbs list={["Bots", "Detail"]} />

            <AppBar position="static" style={{ background: `var(--tabColor)`, borderRadius: '30px' }}>
                <Tabs
                    centered
                    indicatorColor="secondary"
                    textColor="inherit"
                    variant="fullWidth"
                    sx={{
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'var(--tabBorder)', // Change the color of the indicator
                            width: '25vw !important', // Adjust the height of the indicator (or use width for vertical Tabs)
                            height: '3px',
                            marginLeft: '2vw !important',

                        },
                    }}
                    value={tabNumber} onChange={handleChangeTab}>


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
                    }} label="Overview" value="Overview" ></Tab>
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
                    }} label="Wallet" value="Wallet"></Tab>
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
                    }} label="Api" value="Api"></Tab>
                </Tabs>
            </AppBar>
            <div style={{
                marginTop: "24px"
            }}>
                {handleTabContent()}
            </div>

        </div>
    );
}

export default BotDetail;