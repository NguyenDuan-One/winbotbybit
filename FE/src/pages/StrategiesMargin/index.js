import { Tabs, Tab } from "@mui/material";
import Margin from "./tabComponents/Margin";
import Spot from "./tabComponents/Spot";
import { useState } from "react";
import Scanner from "./tabComponents/Scanner";


function StrategiesMargin() {

    const [tabNumber, setTabNumber] = useState("Spot");

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Spot":
                return <Spot />
            case "Margin":
                return <Margin />
            case "Scanner":
                return <Scanner />
        }
    }
    return (
        <div>

            <Tabs value={tabNumber} onChange={handleChangeTab}>
                <Tab label="Spot" value="Spot"></Tab>
                <Tab label="Margin" value="Margin" ></Tab>
                <Tab label="Scanner" value="Scanner" ></Tab>
            </Tabs>
          
                {handleTabContent()}
        </div>
    );
}

export default StrategiesMargin;