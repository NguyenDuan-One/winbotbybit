import { Tab , Tabs} from "@mui/material";
import  { useState } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import CoinContent from "./CoinContent";
import Group from "./Group";


function Coin() {

    const [tabNumber, setTabNumber] = useState("Coin");

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Coin":
                return <CoinContent />
            case "Group":
                return <Group />
        }
    }

    return (
        <div>
            <AddBreadcrumbs list={["Coin"]} />
            {/* <Tabs value={tabNumber} onChange={handleChangeTab}>
                <Tab label="Coin" value="Coin" ></Tab>
                <Tab label="Group" value="Group"></Tab>
            </Tabs> */}
            <div style={{
                 marginTop: "10px",
                 paddingBottom:"55px"
            }}>
                {/* {handleTabContent()} */}
                <CoinContent />
            </div>
        </div>
    );
}

export default Coin;